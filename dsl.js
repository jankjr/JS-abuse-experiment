// Contains the base object that allows us to run
// custom DSLs
const vm = require('vm');

const dsl = ({
  // getter for the global object
  get = (t, n) => t[n],
  // setter for the global object
  set = (t, n, v) => { t[n] = v; },


  globalContext = {},
}, functionToRun) =>  {
  const sandbox = new Proxy(globalContext, { get, set });
  const script = new vm.Script('(' + functionToRun.toString() + `)()`);
  script.runInNewContext(sandbox);
}

module.exports = dsl;