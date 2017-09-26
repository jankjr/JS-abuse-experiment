
const isPrimitive = f =>
  typeof f === 'string' ||
  typeof f === 'number' ||
  typeof f === 'boolean' ||
  f instanceof Number ||
  f instanceof String ||
  f instanceof Boolean;


const trackObject = (obj, fn=null) => {
  const changeSet = [];
  const subTrackers = {};

  const signalChange = (path, oldValue, newValue) => {
    if (fn === null) {
      changeSet.push([path, oldValue, newValue]);
    } else {
      fn(path, oldValue, newValue);
    }
  }

  const listener = propName => (field, oldValue, newValue) => {
    const path = propName + '.' + field;
    signalChange(path, oldValue, newValue);
  }

  const startTracking = obj => Object.keys(obj).forEach(propName => {
    const prop = obj[propName];
    if (isPrimitive(prop)) {
      return;
    }

    subTrackers[propName] = trackObject(
      obj[propName],
      listener(propName),
    );
  });

  startTracking(obj);


  return new Proxy(obj, {
    set: (t, n, v) => {
      const oldValue = obj[n];
      obj[n] = v;

      if (isPrimitive(v)) {
        if (v !== oldValue) {
          signalChange(n, oldValue, v);
        }
      } else if (oldValue !== v) {
        startTracking(v);
        signalChange(n, oldValue, v);
      }
      return v;
    },

    get: (t, n) => {
      if (n === '___isDirty') {
        return changeSet.length !== 0;
      }

      if (n === '___changeSet') {
        if (changeSet.length === 0) {
          return [];
        }
        const copy = changeSet.map(i => i);
        changeSet.length = 0;
        return copy;
      }

      return subTrackers[n] || obj[n];
    },
    deleteProperty: (t, n) => {
      if (subTrackers[n]) {
        delete subTrackers[n];
      }
      const oldValue = obj[n];
      delete obj[n];
      signalChange(n, oldValue, undefined);
    }
  });
}

const trackedObject = trackObject({
  foo: {
    bar: 1,
    baz: 2,
    qud: {}
  },
  x: 42,
  larb: [1,2,3],
});

delete trackedObject.x
trackedObject.y =42;

console.log(trackedObject.___changeSet);





