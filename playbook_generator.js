// playbook_schema_descriptor.js
const PlaybookSchema = {
  idPattern: /^pb_[A-Za-z0-9_\-]+$/,
  nodeIdPattern: /^[A-Za-z0-9_\-]+$/,
  nextPattern: /^$|^[A-Za-z0-9_\-]+$/,
  defaults: {
    playbookVersion: 1,
    nodeVersion: 1,
    rootId: "root"
  }
};

// playbook_generator.js
// Requires: PlaybookSchema from playbook_schema_descriptor.js

function validateId(pattern, value, label) {
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${label} '${value}' does not match pattern ${pattern}`);
  }
}

function generatePlaybook(spec) {
  // spec: {
  //   id: "pb_scam_communication",
  //   label: "Scam communication",
  //   root: "root",                // optional, default "root"
  //   nodes: {
  //     root: {
  //       text: "Root text",
  //       options: [
  //         { label: "Option label", next: "node_1" },
  //         ...
  //       ]
  //     },
  //     node_1: { ... }
  //   }
  // }

  if (!spec || typeof spec !== "object") {
    throw new Error("Playbook spec must be an object");
  }

  const id = spec.id;
  const label = spec.label || spec.id;
  const rootId = spec.root || PlaybookSchema.defaults.rootId;
  const nodesSpec = spec.nodes || {};

  if (!id) throw new Error("Playbook spec must include 'id'");
  validateId(PlaybookSchema.idPattern, id, "playbook id");

  validateId(PlaybookSchema.nodeIdPattern, rootId, "root node id");

  if (!nodesSpec[rootId]) {
    throw new Error(`Root node '${rootId}' is not defined in spec.nodes`);
  }

  const nodes = {};

  Object.entries(nodesSpec).forEach(([nodeId, nodeSpec]) => {
    validateId(PlaybookSchema.nodeIdPattern, nodeId, "node id");

    const text = nodeSpec.text || "";
    const optionsSpec = nodeSpec.options || [];

    const options = optionsSpec.map(opt => {
      if (!opt.label) {
        throw new Error(`Option in node '${nodeId}' is missing 'label'`);
      }
      const next = opt.next || "";
      if (!PlaybookSchema.nextPattern.test(next)) {
        throw new Error(
          `Option 'next' in node '${nodeId}' has invalid value '${next}'`
        );
      }
      return { label: opt.label, next };
    });

    nodes[nodeId] = {
      id: nodeId,
      version: PlaybookSchema.defaults.nodeVersion,
      text,
      options
    };
  });

  return {
    id,
    label,
    version: PlaybookSchema.defaults.playbookVersion,
    root: rootId,
    nodes
  };
}

// Optional: batch generator
function generatePlaybooks(specsArray) {
  if (!Array.isArray(specsArray)) {
    throw new Error("generatePlaybooks expects an array of specs");
  }
  const result = {};
  specsArray.forEach(spec => {
    const pb = generatePlaybook(spec);
    result[pb.id] = pb;
  });
  return result;
}

// Export for use in your app
if (typeof module !== "undefined") {
  module.exports = { generatePlaybook, generatePlaybooks };
} else {
  window.PlaybookGenerator = { generatePlaybook, generatePlaybooks };
}

// playbooks_seed.js
// Requires: PlaybookGenerator, AnomalyLib (or your storage layer)

const scamPlaybookSpec = {
  id: "pb_scam_communication",
  label: "Scam communication",
  root: "root",
  nodes: {
    root: {
      text: "Scam communication playbook. Choose what matches the situation.",
      options: [
        { label: "Caller demands urgent payment", next: "node_urgent" },
        { label: "They ask for codes/passwords", next: "node_codes" },
        { label: "They want remote access/software install", next: "node_remote" }
      ]
    },
    node_urgent: {
      text: "Refuse payment. Hang up. Call official number from your own records.",
      options: [{ label: "Log that I refused and hung up", next: "" }]
    },
    node_codes: {
      text: "Never share codes or passwords. End communication.",
      options: [{ label: "Log that I refused and ended contact", next: "" }]
    },
    node_remote: {
      text: "Do not install anything. End call and report attempt.",
      options: [{ label: "Log that I refused and reported", next: "" }]
    }
  }
};

const techPlaybookSpec = {
  id: "pb_technical_incident",
  label: "Technical incident",
  nodes: {
    root: {
      text: "Technical incident playbook. Start with scope.",
      options: [
        { label: "Single user affected", next: "node_single" },
        { label: "Multiple users / system-wide", next: "node_multi" }
      ]
    },
    node_single: {
      text: "Collect logs and screenshots. Attempt local reproduction.",
      options: [{ label: "Log that I collected evidence", next: "" }]
    },
    node_multi: {
      text: "Escalate to incident response. Start status page update.",
      options: [{ label: "Log that I escalated and updated status", next: "" }]
    }
  }
};

const physicalPlaybookSpec = {
  id: "pb_physical_event",
  label: "Physical event",
  nodes: {
    root: {
      text: "Physical event playbook. Ensure safety first.",
      options: [
        { label: "Immediate safety risk", next: "node_risk" },
        { label: "No immediate danger", next: "node_no_risk" }
      ]
    },
    node_risk: {
      text: "Contact emergency services. Evacuate if needed.",
      options: [{ label: "Log that I contacted emergency services", next: "" }]
    },
    node_no_risk: {
      text: "Document the event and notify facilities/security.",
      options: [{ label: "Log that I notified facilities/security", next: "" }]
    }
  }
};

// Generate and register
const generatedPlaybooks = PlaybookGenerator.generatePlaybooks([
  scamPlaybookSpec,
  techPlaybookSpec,
  physicalPlaybookSpec
]);

Object.values(generatedPlaybooks).forEach(pb => {
  // If you want to plug into AnomalyLib:
  // AnomalyLib.importPlaybook(pb)  // you can add such a function
  // or directly:
  // internalPlaybooks[pb.id] = pb;
});
