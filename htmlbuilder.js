const dsl = require('./dsl');

// This is an HTML builder experiment.
// It sort of builds on the freeText experiment. 

// Utilities to convert a DOM tree to a string.
// Just for illustration purposes, this is NOT the correct way to do
// this.
// 
// Please dont use for anything serious.
const toAttrs = attrs => {
  const attrsAsString = Object.keys(attrs).map(name =>
    `${name}="${attrs[name]}"`
  ).join(' ');

  if (attrsAsString.length) {
    return ' ' + attrsAsString;
  }
  return '';
}

const toHTML = root => {
  if (root.constructor === String) return root;
  const {
    elementName, attrs, children,
  } = root;

  return `<${elementName}${toAttrs(attrs)}>${children.map(toHTML).join('')}</${elementName}>`;
}

const interpolate = (strings, ...values) => {
  let i = 0;
  let buffer = '';
  while (strings[i]) {
    buffer += strings[i];
    if (values[i]) buffer += values[i];
    i += 1;
  }
  return buffer;
}


const htmlBuilder = (f) => {
  // Works by putting open tags on the stack
  // Whenever a closing tag appears, check if the tag name matches
  // and put the node into the parent
  const stack = [];
  let tree = null;
    
  // Helper to get the previous node in the stack
  const previousElement = () => stack[stack.length - 1];

  // The helpers we expose to the builder
  const context = {
    // Used to get the previous node on the stack
    // is used to chain attribute assignment
    // p.foo = 42
    // $.bar = 33
    // 
    // This is because assignment is sadly right associative
    // and parenthesis are not ideal
    get $(){ return previousElement().proxy },

    // Helper to interpolate a string and add it to the previous node
    text: (strings, values) => {
      previousElement().children.push(interpolate(strings, values));
    },
  };


  // Create a new node and pushes it to the top of the stack
  const push = (elementName) => {
    const node = {
      elementName,
      attrs: {},
      children: [],
    };

    stack.push(node);

    // This proxy is what allows us to set
    // attributes on the node
    const p = new Proxy({}, {
      apply: (t, th, args) => args[0],
      get: (t, n) => {
        return node[n]
      },
      set: (t, n, v) => {
        node.attrs[n] = v;
        return p;
      },
    });

    node.proxy = p;

    return p;
  }

  // Pops the previous node and makes sure it matches the closing tag
  const pop = (elementName) => {
    const last = stack.pop();

    if (elementName.slice(1) !== last.elementName) {
      throw new Error(`
        Unclosed Element expected ${last.elementName},
        Got ${elementName.slice(1)}`);
    } else {
      previousElement().children.push(last);
    }
  }


  // The template function
  return (props) => {
    // Reset builder
    stack.length = 0;
    tree = push('root');

    // The DSL
    dsl({
      set: (t, n, v) => {
        return previousElement()[n] = v;
      },
      get: (t, n) => {
        if (n in props) {
          return props[n];
        }

        if (context[n]) {
          return context[n];
        }
        if (n[0] === '_') {
          pop(n);
        } else {
          return push(n);
        }
      }
    }, f);

    return toHTML(tree.children[0]);
  }
}


// This experiment also makes use of the fact that javascript
// automatically inserts semi-colons. This means we don't make to
// delimit out words. Rather the engine sees each line as as statement,
// with a single expression.

// Syntax:
// name            : Start new tag
// name.key = val  : Sets the attribute 'key' to 'val' on a node
// $               : Previous object. Used to chain attribute assignments
// _name           : Closes a tag
// text`string`    : Outputs raw string

const pageTemplate = htmlBuilder(() => {
  html
    head
      title
        // We can handle string interpolations and parameters
        text`Yo! This is the ${$title}`
      _title
    _head
    body
      // This is now attribute assignment could look
      h1.class='foo'
       $.style='font-size: 42px'
       $.someThingElse='foo'
        text`heading of body`
      _h1

      p.style='color: red'
        text`Hi ${$name}`
      _p

      // Loops are simple, loop over input like normal
      $people.forEach(person => {

        p.style='color: blue'
          text`Yo ${person}`
        _p

      })
    _body
  _html
});

console.info(pageTemplate({
  $title: 'Site Title',
  $name: 'Jan',
  $people: [
    'Someone',
    'Here',
    'People?',
  ]
}));
