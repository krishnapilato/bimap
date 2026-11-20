const held = {
  typescript: 'TypeScript 7 is not supported by Angular 22.3 yet',
};

for (const [name, reason] of Object.entries(held)) console.log(`Held back ${name}: ${reason}`);

module.exports = {
  peer: true,
  errorLevel: 2,
  reject: Object.keys(held),
};
