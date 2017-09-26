const dsl = require('./dsl');

const freeText = (f) => {
  const sentences = [];
  let currentSentence = [];

  const nextWord = () => new Proxy({}, {
    get: (t, n) => {
      currentSentence.push(n);
      return nextWord();
    },
  });

  dsl({
    get: (t, n) => {
      if (currentSentence.length !== 0) {
        sentences.push(currentSentence);
        currentSentence = [];
      }
      return nextWord()[n];
    }
  }, f);
  sentences.push(currentSentence);

  return sentences.map(s => s.join(' ')).join('\n');
}

console.info(freeText(() => {
  hello.world
  foo.bar.baz
}));