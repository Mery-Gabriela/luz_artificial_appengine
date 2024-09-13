const speech = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');
const multer  = require('multer')
const cors = require('cors');
const wavFileInfo = require('wav-file-info');
const dotenv = require('dotenv');
const dataService = require('./data.service');
const express = require('express')
const app = express()

app.use(cors())
dotenv.config();

const BUCKET_NAME = process.env.BUCKET_NAME;

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp')
  },
  filename: function (req, file, cb) {
    const [name, suffix] = file.originalname.split('.');

    cb(null, `${name}-${Date.now()}.${suffix}`);
  }
})
const upload = multer({ storage: multerStorage })

const client = new speech.SpeechClient();

async function processAudio(fileName) {
  const storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
  const bucketName = `${BUCKET_NAME}`;
  const filePath = `/tmp/${fileName}`;
  try {
    const infoWav = await new Promise ((resolve, reject) => {
      wavFileInfo.infoByFilename(filePath, function(err, info){
        if (err) return reject(err);
        resolve(info);
      });
    });
    console.log('infoWav', JSON.stringify(infoWav, null, 2));
  } catch (e) {
    console.log('e', e);
  }
  const options = {
    destination: `audio-files/${fileName}`,
  }
  const bucketUploadResponse = await storage.bucket(bucketName).upload(filePath, options);
  console.log('bucketUploadResponse', bucketUploadResponse);
  console.log(`${filePath} uploaded to ${bucketName}`);

  const gcsUri = `gs://${BUCKET_NAME}/audio-files/${fileName}`;

  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    uri: gcsUri,
  };
  const config = {
    // encoding: 'WEBM_OPUS',
    encoding: 'LINEAR16',
    sampleRateHertz: 44100,
    // sampleRateHertz: 48000,
    languageCode: 'es-ES',
    audioChannelCount: 2,
  };

  const request = {
    audio: audio,
    config: config,
  };

  // Detects speech in the audio file
  const [response] = await client.recognize(request);
  console.log(JSON.stringify(response, null, 2));
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  console.log(`Transcription: ${transcription}`);
  return transcription;
}

app.get('/', (req, res) => {
  res.send(dataService.get());
});

const commands = [];

app.put('/', upload.single('audio'), async (req, res) => {
  const transcription = await processAudio(req.file.filename);
  const tokens = transcription.split(' ');
  let place, intensity;
  const isTurnOffCommand = tokens.includes('apagar');
  const isTurnOnCommand = tokens.includes('encender') || tokens.includes('prender');
  if (!isTurnOnCommand && !isTurnOffCommand) {
    commands.push({
      success: false,
      transcription,
      place,
      intensity,
    });
    const id = commands.length;
    res.status(404).send({ id, ...commands[id-1] });
    return;
  }
  if (isTurnOffCommand) {
    if (tokens[1] === 'dormitorio') {
      place = `dormitorio ${literalToNumber(tokens[1])}`;
    } else {
      place = tokens[1];
    }
    intensity = 0;
  }
  if (isTurnOnCommand) {
    const lastToken = tokens[tokens.length - 1];
    if (lastToken.startsWith('baj')) {
      intensity = dataService.LOW;
    } else if (lastToken.startsWith('medi')) {
      intensity = dataService.MID;
    } else if (lastToken.startsWith('alt')) {
      intensity = dataService.HIGH;
    }
    if (tokens[1] === 'dormitorio') {
      place = `dormitorio ${literalToNumber(tokens[2])}`;
    } else {
      place = tokens[1];
    }
  }
  dataService.update(place, intensity);
  commands.push({
    success: true,
    transcription,
    place,
    intensity,
  });
  const id = commands.length;
  res.send({ id, ...commands[id-1] });
});

const literalToNumber = (string) => {
  if (string === 'uno') {
    return 1;
  } else if (string === 'dos') {
    return 2;
  }
  return string;
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
});
