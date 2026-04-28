import {
  Jn,
  convert,
  html_exports
} from "./chunk-4MIBX6SK.mjs";
import {
  require_jsx_runtime
} from "./chunk-3OYPF3ZS.mjs";
import {
  require_react
} from "./chunk-5FLGYLYZ.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@react-email/render/dist/node/index.mjs
init_esm();
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
import { Writable } from "node:stream";
function recursivelyMapDoc(doc, callback) {
  if (Array.isArray(doc)) return doc.map((innerDoc) => recursivelyMapDoc(innerDoc, callback));
  if (typeof doc === "object") {
    if (doc.type === "group") return {
      ...doc,
      contents: recursivelyMapDoc(doc.contents, callback),
      expandedStates: recursivelyMapDoc(doc.expandedStates, callback)
    };
    if ("contents" in doc) return {
      ...doc,
      contents: recursivelyMapDoc(doc.contents, callback)
    };
    if ("parts" in doc) return {
      ...doc,
      parts: recursivelyMapDoc(doc.parts, callback)
    };
    if (doc.type === "if-break") return {
      ...doc,
      breakContents: recursivelyMapDoc(doc.breakContents, callback),
      flatContents: recursivelyMapDoc(doc.flatContents, callback)
    };
  }
  return callback(doc);
}
__name(recursivelyMapDoc, "recursivelyMapDoc");
var modifiedHtml = { ...html_exports };
if (modifiedHtml.printers) {
  const previousPrint = modifiedHtml.printers.html.print;
  modifiedHtml.printers.html.print = (path, options, print, args) => {
    const node = path.getNode();
    const rawPrintingResult = previousPrint(path, options, print, args);
    if (node.type === "ieConditionalComment") return recursivelyMapDoc(rawPrintingResult, (doc) => {
      if (typeof doc === "object" && doc.type === "line") return doc.soft ? "" : " ";
      return doc;
    });
    return rawPrintingResult;
  };
}
var defaults = {
  endOfLine: "lf",
  tabWidth: 2,
  plugins: [modifiedHtml],
  bracketSameLine: true,
  parser: "html"
};
var pretty = /* @__PURE__ */ __name((str, options = {}) => {
  return Jn(str.replaceAll("\0", ""), {
    ...defaults,
    ...options
  });
}, "pretty");
var plainTextSelectors = [
  {
    selector: "img",
    format: "skip"
  },
  {
    selector: "[data-skip-in-text=true]",
    format: "skip"
  },
  {
    selector: "a",
    options: {
      linkBrackets: false,
      hideLinkHrefIfSameAsText: true
    }
  }
];
function toPlainText(html$1, options) {
  return convert(html$1, {
    selectors: plainTextSelectors,
    wordwrap: false,
    ...options
  });
}
__name(toPlainText, "toPlainText");
var readStream = /* @__PURE__ */ __name(async (stream) => {
  let result = "";
  const decoder = new TextDecoder("utf-8");
  if ("pipeTo" in stream) {
    const writableStream = new WritableStream({
      write(chunk) {
        result += decoder.decode(chunk, { stream: true });
      },
      close() {
        result += decoder.decode();
      }
    });
    await stream.pipeTo(writableStream);
  } else {
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        result += decoder.decode(chunk, { stream: true });
        callback();
      },
      final(callback) {
        result += decoder.decode();
        callback();
      }
    });
    stream.pipe(writable);
    await new Promise((resolve, reject) => {
      writable.on("error", reject);
      writable.on("close", () => {
        resolve();
      });
    });
  }
  return result;
}, "readStream");
var render = /* @__PURE__ */ __name(async (node, options) => {
  const suspendedElement = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, { children: node });
  const reactDOMServer = await import("./server.node-TXHJFIPK.mjs").then((m) => m.default);
  let html$1;
  if (Object.hasOwn(reactDOMServer, "renderToReadableStream") && typeof WritableStream !== "undefined") html$1 = await readStream(await reactDOMServer.renderToReadableStream(suspendedElement, { progressiveChunkSize: Number.POSITIVE_INFINITY }));
  else await new Promise((resolve, reject) => {
    const stream = reactDOMServer.renderToPipeableStream(suspendedElement, {
      async onAllReady() {
        html$1 = await readStream(stream);
        resolve();
      },
      onError(error) {
        reject(error);
      },
      progressiveChunkSize: Number.POSITIVE_INFINITY
    });
  });
  if (options?.plainText) return toPlainText(html$1, options.htmlToTextOptions);
  const document = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">${html$1.replace(/<!DOCTYPE.*?>/, "")}`;
  if (options?.pretty) return pretty(document);
  return document;
}, "render");
var renderAsync = /* @__PURE__ */ __name((element, options) => {
  return render(element, options);
}, "renderAsync");
export {
  plainTextSelectors,
  pretty,
  render,
  renderAsync,
  toPlainText
};
//# sourceMappingURL=node-3LCXHZLP.mjs.map
