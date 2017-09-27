/**
 * dirtyChecking implemented using Proxies.
 *
 * The tracking function works as following:
 *
 * When wrapping an object with a tracking function,
 * each property on the object, or element in array, gets recursively
 * tracked. On get/set the Proxies again recursively follow the chain
 * of properties until.
 *
 * When a primitive value is changed/accessed the
 *
 * The root tracker maintains a list of changes, that the child
 * trackers can signal to the root.
 *
 * Mutations from the set/delete functions are handed depending on
 * the nature of the change.
 *
 * Does not support Maps or Sets as of yet.
 */

const isPrimitive = f =>
  f === null ||
  f === undefined ||
  typeof f === 'string' ||
  typeof f === 'number' ||
  typeof f === 'boolean' ||
  typeof f === 'function' ||
  f instanceof Number ||
  f instanceof String ||
  f instanceof Boolean ||
  f.constructor && f.constructor === Symbol;

const API_KEY = Symbol('api');

const ROOT_CONFIG = {
  signal: null,
  trackReads: false,
  isRoot: true,
  trackReads: false
};

const pathBuffer = () => {
  let buff = new Buffer(10000);
  let pathLocation = 0;

  return {
    isEmpty: () => pathLocation === 0,
    addPathPart: (str) => {
      pathLocation += buff.write(str, pathLocation);
    },
    resetPath: () => {
      pathLocation = 0;
    },
    pathBufferToString: () => {
      return buff.toString('utf-8', 0, pathLocation);
    }
  }
}

const isSpecialContainer = (value) => {
}

const trackObject = (obj, config) => {
  const path = config.path || pathBuffer();

  const {
    onRead = () => {
      if (trackReads) {
        readSet.push(path.pathBufferToString());
      }
      path.resetPath();
    },
    onWrite = (oldValue, newValue) => {
      changeSet.push([path.pathBufferToString(), oldValue, newValue]);
      path.resetPath();
    },
    dontTrackDiff,
    isRoot,
    trackReads
  } = config;

  const childConfig = isRoot ? {
    ... config,
    onWrite,
    path,
    onRead,
    isRoot: false,
  } : config

  const readSet = isRoot ? [] : null;
  const changeSet = isRoot ? [] : null;
  const childProxies = {};


  const registerChangeListenerOnField = (fieldName, value) => {
    if (isPrimitive(value)) {
      return;
    }
    childProxies[fieldName] = trackObject(
      value,
      childConfig,
    ).object;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      registerChangeListenerOnField(i, obj[i]);
    }
  } else {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      registerChangeListenerOnField(keys[i], obj[keys[i]]);
    }
    const symbols = Object.getOwnPropertySymbols(obj);
    for (let i = 0; i < keys.length; i++) {
      registerChangeListenerOnField(symbols[i], obj[symbols[i]]);
    }
  }

  const getValue = (fieldName) => {
    return childProxies[fieldName] || obj[fieldName];
  }

  const setValue = (fieldName, oldValue, newValue) => {
    obj[fieldName] = newValue;
    onWrite(oldValue, newValue);
    return getValue(fieldName);
  }

  const rememberPath = (fieldName) => {
    if (isRoot) {
      if (!path.isEmpty()) {
        onRead();
      }

      path.addPathPart('root');
    }
    if (Array.isArray(obj[fieldName])){
      path.addPathPart('[' + fieldName.toString() + ']');
    } else {
      path.addPathPart('.' + fieldName.toString());
    }
  }

  const api = {
    wasAccessed: () => readSet.lenfth !== 0,
    isDirty: () => changeSet.length !== 0,
    observeReads: () => {
      const copy = readSet.map(i => i);
      readSet.length = 0;
      return copy;
    },
    observeChanges: () => {
      const copy = changeSet.map(i => i);
      changeSet.length = 0;
      return copy;
    },
  }

  return {
    api,
    object: new Proxy(obj, {
      set: (t, fieldName, newValue) => {
        rememberPath(fieldName);

        let oldValue = getValue(fieldName);

        if (isPrimitive(oldValue)) {
          if (isPrimitive(newValue)) {
            if (newValue !== oldValue) {
              setValue(fieldName, oldValue, newValue);
            }
          } else {
            registerChangeListenerOnField(fieldName, newValue);
            setValue(fieldName, oldValue, newValue);
          }
        } else {
          if (isPrimitive(newValue)) {
            registerChangeListenerOnField(fieldName, newValue);
            setValue(oldValue, newValue);
          } else {
            if (oldValue !== newValue) {
              registerChangeListenerOnField(fieldName, newValue);
              setValue(fieldName, oldValue, newValue);
            }
          }
        }
        return getValue(fieldName);
      },
      get: (t, fieldName) => {
        if (fieldName.constructor === Symbol &&
           !childProxies[fieldName]) {
          return obj[fieldName];
        }

        if (typeof obj[fieldName] === 'function') {
          return obj[fieldName];
        }


        rememberPath(fieldName);

        if (childProxies[fieldName]) {
          return childProxies[fieldName];
        }

        // We are at the bottom of the call
        onRead(obj[fieldName]);
        return getValue(fieldName);
      },

      deleteProperty: (t, fieldName) => {
        rememberPath(fieldName);
        const oldValue = obj[fieldName];
        delete obj[fieldName];
        delete childProxies[fieldName];
        onWrite(fieldName, oldValue, undefined);
        return true;
      }
    }),
  };
}

const trackObjectChanges = (obj, trackReads=false) => trackObject(
  obj,
  { ... ROOT_CONFIG, trackReads },
);



module.exports = trackObjectChanges;
