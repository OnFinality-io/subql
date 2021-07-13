(window.webpackJsonp=window.webpackJsonp||[]).push([[4],{374:function(e,t,a){e.exports=a.p+"assets/img/subQuery_directory_stucture.917232ef.png"},375:function(e,t,a){e.exports=a.p+"assets/img/logging_info.6549410d.png"},376:function(e,t,a){e.exports=a.p+"assets/img/logging_debug.e6c459a1.png"},377:function(e,t,a){e.exports=a.p+"assets/img/subquery_logging.f645b791.png"},405:function(e,t,a){"use strict";a.r(t);var r=a(44),s=Object(r.a)({},(function(){var e=this,t=e.$createElement,r=e._self._c||t;return r("ContentSlotsDistributor",{attrs:{"slot-key":e.$parent.slotKey}},[r("h1",{attrs:{id:"creating-a-subquery-project"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#creating-a-subquery-project"}},[e._v("#")]),e._v(" Creating a SubQuery Project")]),e._v(" "),r("p",[e._v("In the "),r("RouterLink",{attrs:{to:"/quickstart/quickstart.html"}},[e._v("quick start")]),e._v(" guide, we very quickly ran through an example to give you a taste of what SubQuery is and how it works. Here we'll take a closer look at the worklow when creating your own project and the key files you'll be working with.")],1),e._v(" "),r("h2",{attrs:{id:"the-basic-workflow"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#the-basic-workflow"}},[e._v("#")]),e._v(" The Basic Workflow")]),e._v(" "),r("p",[e._v("Some of the following examples will assume you have successfully initialized the starter package in the "),r("RouterLink",{attrs:{to:"/quickstart/quickstart.html"}},[e._v("Quick start")]),e._v(" section. From that starter package, we'll walk through the standard process to customise and implement your own SubQuery project.")],1),e._v(" "),r("ol",[r("li",[e._v("Initalise your project using "),r("code",[e._v("subql init PROJECT_NAME")])]),e._v(" "),r("li",[e._v("Update the Manifest file ("),r("code",[e._v("project.yaml")]),e._v(") to include information about your blockchain, and the entities that you will map - see "),r("RouterLink",{attrs:{to:"/create/manifest.html"}},[e._v("Manifest File")])],1),e._v(" "),r("li",[e._v("Create GraphQL entities in your schema ("),r("code",[e._v("schema.graphql")]),e._v(") that define the shape of the data that you will extract and persist for querying - see "),r("RouterLink",{attrs:{to:"/create/graphql.html"}},[e._v("GraphQL Schema")])],1),e._v(" "),r("li",[e._v("Add all the mapping functions (eg "),r("code",[e._v("mappingHandlers.ts")]),e._v(") you wish to invoke to transform chain data to the GraphQL entities that you have defined - see "),r("RouterLink",{attrs:{to:"/create/mapping.html"}},[e._v("Mapping")])],1),e._v(" "),r("li",[e._v("Generate, build, and publish your code to SubQuery Projects (or run in your own local node) - see "),r("RouterLink",{attrs:{to:"/create/quickstart.html#running-and-querying-your-starter-project"}},[e._v("Running and Querying your Starter Project")]),e._v(" in our quick start guide.")],1)]),e._v(" "),r("h2",{attrs:{id:"directory-structure"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#directory-structure"}},[e._v("#")]),e._v(" Directory Structure")]),e._v(" "),r("p",[e._v("The following map provides an overview of the directory structure of a SubQuery project when the "),r("code",[e._v("init")]),e._v(" command is run.")]),e._v(" "),r("div",{staticClass:"language- extra-class"},[r("pre",{pre:!0,attrs:{class:"language-text"}},[r("code",[e._v("- project-name\n  L package.json\n  L project.yaml\n  L README.md\n  L schema.graphql\n  L tsconfig.json\n  L docker-compose.yml\n  L src\n    L index.ts\n    L mappings\n      L mappingHandlers.ts\n  L .gitignore\n")])])]),r("p",[e._v("For example:")]),e._v(" "),r("p",[r("img",{attrs:{src:a(374),alt:"SubQuery diretory structure"}})]),e._v(" "),r("h2",{attrs:{id:"code-generation"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#code-generation"}},[e._v("#")]),e._v(" Code Generation")]),e._v(" "),r("p",[e._v("Whenever you change your GraphQL entities, you must regenerate your types directory with the following command.")]),e._v(" "),r("div",{staticClass:"language- extra-class"},[r("pre",{pre:!0,attrs:{class:"language-text"}},[r("code",[e._v("yarn codegen\n")])])]),r("p",[e._v("This will create a new directory (or update the existing) "),r("code",[e._v("src/types")]),e._v(" which contains generated entity classes for each type you have defined previously in "),r("code",[e._v("schema.graphql")]),e._v(". These classes provide type-safe entity loading, read and write access to entity fields - see more about this process in "),r("RouterLink",{attrs:{to:"/create/graphql.html"}},[e._v("the GraphQL Schema")]),e._v(".")],1),e._v(" "),r("h2",{attrs:{id:"build"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#build"}},[e._v("#")]),e._v(" Build")]),e._v(" "),r("p",[e._v("In order run your SubQuery Project on a locally hosted SubQuery Node, you need to first build your work.")]),e._v(" "),r("p",[e._v("Run the build command from the project's root directory.")]),e._v(" "),r("div",{staticClass:"language-shell extra-class"},[r("pre",{pre:!0,attrs:{class:"language-shell"}},[r("code",[r("span",{pre:!0,attrs:{class:"token comment"}},[e._v("# Yarn")]),e._v("\n"),r("span",{pre:!0,attrs:{class:"token function"}},[e._v("yarn")]),e._v(" build\n\n"),r("span",{pre:!0,attrs:{class:"token comment"}},[e._v("# NPM")]),e._v("\n"),r("span",{pre:!0,attrs:{class:"token function"}},[e._v("npm")]),e._v(" run-script build\n")])])]),r("h2",{attrs:{id:"logging"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#logging"}},[e._v("#")]),e._v(" Logging")]),e._v(" "),r("p",[e._v("The "),r("code",[e._v("console.log")]),e._v(" method is "),r("strong",[e._v("no longer supported")]),e._v(". Instead a "),r("code",[e._v("logger")]),e._v(" module has been injected in the types, which means we can support a logger that can accept various logging levels.")]),e._v(" "),r("div",{staticClass:"language-typescript extra-class"},[r("pre",{pre:!0,attrs:{class:"language-typescript"}},[r("code",[e._v("logger"),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(".")]),r("span",{pre:!0,attrs:{class:"token function"}},[e._v("info")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v("(")]),r("span",{pre:!0,attrs:{class:"token string"}},[e._v("'Info level message'")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(")")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(";")]),e._v("\nlogger"),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(".")]),r("span",{pre:!0,attrs:{class:"token function"}},[e._v("debug")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v("(")]),r("span",{pre:!0,attrs:{class:"token string"}},[e._v("'Debugger level message'")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(")")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(";")]),e._v("\nlogger"),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(".")]),r("span",{pre:!0,attrs:{class:"token function"}},[e._v("warn")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v("(")]),r("span",{pre:!0,attrs:{class:"token string"}},[e._v("'Warning level message'")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(")")]),r("span",{pre:!0,attrs:{class:"token punctuation"}},[e._v(";")]),e._v("\n")])])]),r("p",[e._v("To use "),r("code",[e._v("logger.info")]),e._v(" or "),r("code",[e._v("logger.warn")]),e._v(", just place the line into your mapping file.")]),e._v(" "),r("p",[r("img",{attrs:{src:a(375),alt:"logging.info"}})]),e._v(" "),r("p",[e._v("To use "),r("code",[e._v("logger.debug")]),e._v(", an additional step is required. Add "),r("code",[e._v("--log-level=debug")]),e._v(" to your command line.")]),e._v(" "),r("p",[e._v("If you are running a docker container, add this line to your "),r("code",[e._v("docker-compose.yaml")]),e._v(" file.")]),e._v(" "),r("p",[r("img",{attrs:{src:a(376),alt:"logging.debug"}})]),e._v(" "),r("p",[e._v("You should now see the new logging in the terminal screen.")]),e._v(" "),r("p",[r("img",{attrs:{src:a(377),alt:"logging.debug"}})])])}),[],!1,null,null,null);t.default=s.exports}}]);