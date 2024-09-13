let data = [
    { id: 17, name: 'cocina', intensity: 0 },
    { id: 27, name: 'dormitorio 2', intensity: 0 },
    { id: 25, name: 'baño', intensity: 0 },
    { id: 5, name: 'cochera', intensity: 0 },
    { id: 6, name: 'sala', intensity: 0 },
    { id: 26, name: 'comedor', intensity: 0 },
    { id: 23, name: 'escritorio', intensity: 0 },
    { id: 24, name: 'dormitorio 1', intensity: 0 },
];

module.exports = {
    get: () => {
        return data;
    },
    update: (name, intensity) => {
        intensity = (intensity ? intensity : 0)
        if (name === 'todos') {
            data.forEach(d => d.intensity = intensity);
        }
        const index = data.findIndex(d => d.name === name);
        if (index !== -1) {
            data[index].intensity = intensity;
        }
    },
    OFF: 0,
    LOW: 25,
    MID: 128,
    HIGH: 255
};
