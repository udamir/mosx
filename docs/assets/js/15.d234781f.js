(window.webpackJsonp=window.webpackJsonp||[]).push([[15],{363:function(t,s,a){"use strict";a.r(s);var e=a(42),r=Object(e.a)({},(function(){var t=this,s=t.$createElement,a=t._self._c||s;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h1",{attrs:{id:"tracker-api"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#tracker-api"}},[t._v("#")]),t._v(" Tracker API")]),t._v(" "),a("h2",{attrs:{id:"concept"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#concept"}},[t._v("#")]),t._v(" Concept")]),t._v(" "),a("p",[t._v("Tracker instance can be created only to root node (Mosx object) of state tree, then it will be avalible in all child nodes. Only one tracker can be created for state.")]),t._v(" "),a("h2",{attrs:{id:"create-tracker"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#create-tracker"}},[t._v("#")]),t._v(" Create tracker")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// create new tracker")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("const")]),t._v(" tracker "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" Mosx"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("createTracker")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("state"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v(" serializer"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" reversible "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),a("p",[t._v("The following parameters can be used:")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("export")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IMosxTrackerParams")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  serializer"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v("\n  reversible"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("boolean")]),t._v("\n  privateMapValuePatch"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("boolean")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("Set "),a("code",[t._v("reversible")]),t._v(" as true if you need to get oldValue in JsonPatch:")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("export")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IEncodedJsonPatch")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  op"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"replace"')]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"remove"')]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"add"')]),t._v("\n  path"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Path\n  value"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// value is not available for remove operations")]),t._v("\n  oldValue"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// only if reversible enabled")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("Set "),a("code",[t._v("serializer")]),t._v(" if you need to get encoded patch in JsonPatch:")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("export")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IEncodedJsonPatch")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  op"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"replace"')]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"remove"')]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"add"')]),t._v("\n  path"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Path\n  value"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// value is not available for remove operations")]),t._v("\n  oldValue"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// only if reversible enabled")]),t._v("\n  encoded"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Buffer "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// only if serializer set")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("::: info\nRead more about "),a("RouterLink",{attrs:{to:"/mosx/serializer.html"}},[t._v("serializer")]),t._v("\n:::")],1),t._v(" "),a("p",[t._v("Set "),a("code",[t._v("privateMapValuePatch")]),t._v(" if you need to get patches for hidden map items as undefined")]),t._v(" "),a("h2",{attrs:{id:"get-tracker"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#get-tracker"}},[t._v("#")]),t._v(" Get tracker")]),t._v(" "),a("p",[t._v("Get tracker from any node of state tree:")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[t._v("  "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("const")]),t._v(" player "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" state"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("players"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("0")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v("\n\n  "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// get existing tracker")]),t._v("\n  "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("const")]),t._v(" tracker "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" Mosx"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("getTracker")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("player"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),a("h2",{attrs:{id:"tracker-snapshot"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#tracker-snapshot"}},[t._v("#")]),t._v(" tracker.snapshot")]),t._v(" "),a("p",[t._v("Return serialized snapshot if serialized is defined, if not - return Mosx.getSnapshot")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[t._v("  "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("snapshot")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token parameter"}},[t._v("params"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" IMosxSnapshotParams")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("const")]),t._v(" snapshot "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" Mosx"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("getSnapshot")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("this")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("root"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" params "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("&&")]),t._v(" params"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("tags"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("return")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("this")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("serializer \n      "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("this")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("serializer"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("encodeSnapshot")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("snapshot"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" \n      "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" snapshot\n  "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("export")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IMosxSnapshotParams")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  tags"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v("\n  spy"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("boolean")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("Set access "),a("code",[t._v("tags")]),t._v(" parameter to get snapshot with private objects/properties.")]),t._v(" "),a("p",[t._v("Set "),a("code",[t._v("spy")]),t._v(" as true if you need to get full snapshot including all private objects/properties")]),t._v(" "),a("h2",{attrs:{id:"tracker-onpatch"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#tracker-onpatch"}},[t._v("#")]),t._v(" tracker.onPatch")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token function"}},[t._v("onPatch")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token parameter"}},[t._v("listener"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" MosxPatchListener"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("<")]),a("span",{pre:!0,attrs:{class:"token constant"}},[t._v("T")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" params"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" IMosxPatchParams")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=>")]),t._v(" IDisposer\n")])])]),a("p",[t._v("Use "),a("code",[t._v("onPatch")]),t._v(" method to add listener for state stree change.")]),t._v(" "),a("p",[t._v("The following parameters can be used:")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("export")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IMosxPatchParams")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  tags"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("string")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v("\n  filter"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" JsonPatchOp "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" JsonPatchOp"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v("\n  reversible"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("boolean")]),t._v("\n  spy"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("boolean")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("Set access "),a("code",[t._v("tags")]),t._v(" parameter to recieve patches for private objects/properties.")]),t._v(" "),a("p",[t._v("Set "),a("code",[t._v("filter")]),t._v(' parameter to any operations ("add", "replace", "remove") fo recieve patches for choosen operations.')]),t._v(" "),a("p",[t._v("Set "),a("code",[t._v("reversible")]),t._v(" as true if you need to get oldValue in JsonPatch:")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("export")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("interface")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IReversibleJsonPatch")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  op"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"replace"')]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"remove"')]),t._v(" "),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token string"}},[t._v('"add"')]),t._v("\n  path"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Path\n  value"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// value is not available for remove operations")]),t._v("\n  oldValue"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("?")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("any")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// only if reversible enabled")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),a("p",[t._v("Set "),a("code",[t._v("spy")]),t._v(" as true if you need to recieve all patches including private objects/properties")]),t._v(" "),a("h3",{attrs:{id:"tracker-dispose"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#tracker-dispose"}},[t._v("#")]),t._v(" tracker.dispose")]),t._v(" "),a("div",{staticClass:"language-ts extra-class"},[a("pre",{pre:!0,attrs:{class:"language-ts"}},[a("code",[t._v("  "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("dispose")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("void")]),t._v("\n")])])]),a("p",[t._v("Dispose tracker.")])])}),[],!1,null,null,null);s.default=r.exports}}]);