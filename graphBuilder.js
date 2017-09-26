const dsl = require('./dsl');

const graph = (f) => {
  const vertices = {};
  const edges = {};

  const addEdge = (a, b, attrs={}) => {
    if (!vertices[a]) {
      vertices[a] = {};
    }

    if (!vertices[b]) {
      vertices[b] = {};
    }

    edges[a] = edges[a] || {};
    edges[a][b] = attrs;

    edges[b] = edges[b] || {};
    edges[b][a] = attrs;
  }

  dsl({
    get: (t, name) => {
      const vertex = (attrs) => ({
        ___edge: true, vertex, attrs,
      });
      vertex.___ref = true;
      vertex.vertexName = name;

      return vertex;
    },

    set: (t, name, value) => {
      if (value.___ref) {
        addEdge(name, value.vertexName);
      }
      else if (value.___edge) {
        addEdge(name, value.vertex.vertexName, value.attrs);
      }
      else {
        // define vertex
        vertices[name] = {
          ...value,
          id: name,
        };
      }
    }
  }, f);

  return {
    vertices,
    edges,
  }
}

// DSL is as follows:
// names always refers to nodes
// 
// name = data : Assign attributes to a vertex in the graph
// nameA = nameB : Create an edge between the Vertices nameA and nameB
// nameA = nameB(data) : Create an edge with data between A and B  
const g = graph(() => {
  // Define some vertices with different scoes
  a = { score: 43 };
  b = { score: 12 };
  c = { score: 32 };

  // Add some attributes to the relation
  a = c({ weight: 42 });
  a = b;
});

console.info(JSON.stringify(g, null, 2));
