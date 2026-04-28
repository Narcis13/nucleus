import {
  expandMergeTags
} from "../../../../../chunk-YBODE3O7.mjs";
import "../../../../../chunk-K6V5PMDA.mjs";
import {
  and,
  dbAdmin,
  emailCampaignRecipients,
  emailCampaigns,
  env,
  eq,
  fromAddress,
  getResend,
  init_server_only,
  professionals,
  sql
} from "../../../../../chunk-BH5TO44N.mjs";
import "../../../../../chunk-3OYPF3ZS.mjs";
import "../../../../../chunk-5FLGYLYZ.mjs";
import {
  task
} from "../../../../../chunk-O6KEYEYL.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import {
  __export,
  __name,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// trigger/jobs/campaigns.ts
init_esm();

// lib/services/marketing/process-campaign-send.ts
init_esm();
init_server_only();

// lib/db/queries/marketing.ts
init_esm();
init_server_only();
async function markRecipientSent(args) {
  await dbAdmin.update(emailCampaignRecipients).set({
    status: args.error ? "error" : "sent",
    resendMessageId: args.resendMessageId ?? null,
    error: args.error ?? null,
    sentAt: /* @__PURE__ */ new Date()
  }).where(eq(emailCampaignRecipients.id, args.id));
}
__name(markRecipientSent, "markRecipientSent");
async function finalizeCampaignSend(campaignId, sentCount) {
  await dbAdmin.update(emailCampaigns).set({
    status: "sent",
    sentAt: /* @__PURE__ */ new Date(),
    sentCount
  }).where(eq(emailCampaigns.id, campaignId));
}
__name(finalizeCampaignSend, "finalizeCampaignSend");

// lib/posthog/events.ts
init_esm();
init_server_only();

// lib/posthog/server.ts
init_esm();
init_server_only();

// node_modules/posthog-node/dist/entrypoints/index.node.mjs
init_esm();

// node_modules/posthog-node/dist/extensions/error-tracking/modifiers/module.node.mjs
init_esm();
import { dirname, posix, sep } from "path";
function createModulerModifier() {
  const getModuleFromFileName = createGetModuleFromFilename();
  return async (frames) => {
    for (const frame of frames) frame.module = getModuleFromFileName(frame.filename);
    return frames;
  };
}
__name(createModulerModifier, "createModulerModifier");
function createGetModuleFromFilename(basePath = process.argv[1] ? dirname(process.argv[1]) : process.cwd(), isWindows = "\\" === sep) {
  const normalizedBase = isWindows ? normalizeWindowsPath(basePath) : basePath;
  return (filename) => {
    if (!filename) return;
    const normalizedFilename = isWindows ? normalizeWindowsPath(filename) : filename;
    let { dir, base: file, ext } = posix.parse(normalizedFilename);
    if (".js" === ext || ".mjs" === ext || ".cjs" === ext) file = file.slice(0, -1 * ext.length);
    const decodedFile = decodeURIComponent(file);
    if (!dir) dir = ".";
    const n = dir.lastIndexOf("/node_modules");
    if (n > -1) return `${dir.slice(n + 14).replace(/\//g, ".")}:${decodedFile}`;
    if (dir.startsWith(normalizedBase)) {
      const moduleName = dir.slice(normalizedBase.length + 1).replace(/\//g, ".");
      return moduleName ? `${moduleName}:${decodedFile}` : decodedFile;
    }
    return decodedFile;
  };
}
__name(createGetModuleFromFilename, "createGetModuleFromFilename");
function normalizeWindowsPath(path) {
  return path.replace(/^[A-Z]:/, "").replace(/\\/g, "/");
}
__name(normalizeWindowsPath, "normalizeWindowsPath");

// node_modules/posthog-node/dist/extensions/error-tracking/modifiers/context-lines.node.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/index.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/featureFlagUtils.mjs
init_esm();
var normalizeFlagsResponse = /* @__PURE__ */ __name((flagsResponse) => {
  if ("flags" in flagsResponse) {
    const featureFlags = getFlagValuesFromFlags(flagsResponse.flags);
    const featureFlagPayloads = getPayloadsFromFlags(flagsResponse.flags);
    return {
      ...flagsResponse,
      featureFlags,
      featureFlagPayloads
    };
  }
  {
    const featureFlags = flagsResponse.featureFlags ?? {};
    const featureFlagPayloads = Object.fromEntries(Object.entries(flagsResponse.featureFlagPayloads || {}).map(([k, v]) => [
      k,
      parsePayload(v)
    ]));
    const flags = Object.fromEntries(Object.entries(featureFlags).map(([key, value]) => [
      key,
      getFlagDetailFromFlagAndPayload(key, value, featureFlagPayloads[key])
    ]));
    return {
      ...flagsResponse,
      featureFlags,
      featureFlagPayloads,
      flags
    };
  }
}, "normalizeFlagsResponse");
function getFlagDetailFromFlagAndPayload(key, value, payload) {
  return {
    key,
    enabled: "string" == typeof value ? true : value,
    variant: "string" == typeof value ? value : void 0,
    reason: void 0,
    metadata: {
      id: void 0,
      version: void 0,
      payload: payload ? JSON.stringify(payload) : void 0,
      description: void 0
    }
  };
}
__name(getFlagDetailFromFlagAndPayload, "getFlagDetailFromFlagAndPayload");
var getFlagValuesFromFlags = /* @__PURE__ */ __name((flags) => Object.fromEntries(Object.entries(flags ?? {}).map(([key, detail]) => [
  key,
  getFeatureFlagValue(detail)
]).filter(([, value]) => void 0 !== value)), "getFlagValuesFromFlags");
var getPayloadsFromFlags = /* @__PURE__ */ __name((flags) => {
  const safeFlags = flags ?? {};
  return Object.fromEntries(Object.keys(safeFlags).filter((flag) => {
    const details = safeFlags[flag];
    return details.enabled && details.metadata && void 0 !== details.metadata.payload;
  }).map((flag) => {
    const payload = safeFlags[flag].metadata?.payload;
    return [
      flag,
      payload ? parsePayload(payload) : void 0
    ];
  }));
}, "getPayloadsFromFlags");
var getFeatureFlagValue = /* @__PURE__ */ __name((detail) => void 0 === detail ? void 0 : detail.variant ?? detail.enabled, "getFeatureFlagValue");
var parsePayload = /* @__PURE__ */ __name((response) => {
  if ("string" != typeof response) return response;
  try {
    return JSON.parse(response);
  } catch {
    return response;
  }
}, "parsePayload");

// node_modules/posthog-node/node_modules/@posthog/core/dist/vendor/uuidv7.mjs
init_esm();
var DIGITS = "0123456789abcdef";
var UUID = class _UUID {
  static {
    __name(this, "UUID");
  }
  constructor(bytes) {
    this.bytes = bytes;
  }
  static ofInner(bytes) {
    if (16 === bytes.length) return new _UUID(bytes);
    throw new TypeError("not 128-bit length");
  }
  static fromFieldsV7(unixTsMs, randA, randBHi, randBLo) {
    if (!Number.isInteger(unixTsMs) || !Number.isInteger(randA) || !Number.isInteger(randBHi) || !Number.isInteger(randBLo) || unixTsMs < 0 || randA < 0 || randBHi < 0 || randBLo < 0 || unixTsMs > 281474976710655 || randA > 4095 || randBHi > 1073741823 || randBLo > 4294967295) throw new RangeError("invalid field value");
    const bytes = new Uint8Array(16);
    bytes[0] = unixTsMs / 2 ** 40;
    bytes[1] = unixTsMs / 2 ** 32;
    bytes[2] = unixTsMs / 2 ** 24;
    bytes[3] = unixTsMs / 2 ** 16;
    bytes[4] = unixTsMs / 256;
    bytes[5] = unixTsMs;
    bytes[6] = 112 | randA >>> 8;
    bytes[7] = randA;
    bytes[8] = 128 | randBHi >>> 24;
    bytes[9] = randBHi >>> 16;
    bytes[10] = randBHi >>> 8;
    bytes[11] = randBHi;
    bytes[12] = randBLo >>> 24;
    bytes[13] = randBLo >>> 16;
    bytes[14] = randBLo >>> 8;
    bytes[15] = randBLo;
    return new _UUID(bytes);
  }
  static parse(uuid) {
    let hex;
    switch (uuid.length) {
      case 32:
        hex = /^[0-9a-f]{32}$/i.exec(uuid)?.[0];
        break;
      case 36:
        hex = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(uuid)?.slice(1, 6).join("");
        break;
      case 38:
        hex = /^\{([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\}$/i.exec(uuid)?.slice(1, 6).join("");
        break;
      case 45:
        hex = /^urn:uuid:([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(uuid)?.slice(1, 6).join("");
        break;
      default:
        break;
    }
    if (hex) {
      const inner = new Uint8Array(16);
      for (let i = 0; i < 16; i += 4) {
        const n = parseInt(hex.substring(2 * i, 2 * i + 8), 16);
        inner[i + 0] = n >>> 24;
        inner[i + 1] = n >>> 16;
        inner[i + 2] = n >>> 8;
        inner[i + 3] = n;
      }
      return new _UUID(inner);
    }
    throw new SyntaxError("could not parse UUID string");
  }
  toString() {
    let text = "";
    for (let i = 0; i < this.bytes.length; i++) {
      text += DIGITS.charAt(this.bytes[i] >>> 4);
      text += DIGITS.charAt(15 & this.bytes[i]);
      if (3 === i || 5 === i || 7 === i || 9 === i) text += "-";
    }
    return text;
  }
  toHex() {
    let text = "";
    for (let i = 0; i < this.bytes.length; i++) {
      text += DIGITS.charAt(this.bytes[i] >>> 4);
      text += DIGITS.charAt(15 & this.bytes[i]);
    }
    return text;
  }
  toJSON() {
    return this.toString();
  }
  getVariant() {
    const n = this.bytes[8] >>> 4;
    if (n < 0) throw new Error("unreachable");
    if (n <= 7) return this.bytes.every((e) => 0 === e) ? "NIL" : "VAR_0";
    if (n <= 11) return "VAR_10";
    if (n <= 13) return "VAR_110";
    if (n <= 15) return this.bytes.every((e) => 255 === e) ? "MAX" : "VAR_RESERVED";
    else throw new Error("unreachable");
  }
  getVersion() {
    return "VAR_10" === this.getVariant() ? this.bytes[6] >>> 4 : void 0;
  }
  clone() {
    return new _UUID(this.bytes.slice(0));
  }
  equals(other) {
    return 0 === this.compareTo(other);
  }
  compareTo(other) {
    for (let i = 0; i < 16; i++) {
      const diff = this.bytes[i] - other.bytes[i];
      if (0 !== diff) return Math.sign(diff);
    }
    return 0;
  }
};
var V7Generator = class {
  static {
    __name(this, "V7Generator");
  }
  constructor(randomNumberGenerator) {
    this.timestamp = 0;
    this.counter = 0;
    this.random = randomNumberGenerator ?? getDefaultRandom();
  }
  generate() {
    return this.generateOrResetCore(Date.now(), 1e4);
  }
  generateOrAbort() {
    return this.generateOrAbortCore(Date.now(), 1e4);
  }
  generateOrResetCore(unixTsMs, rollbackAllowance) {
    let value = this.generateOrAbortCore(unixTsMs, rollbackAllowance);
    if (void 0 === value) {
      this.timestamp = 0;
      value = this.generateOrAbortCore(unixTsMs, rollbackAllowance);
    }
    return value;
  }
  generateOrAbortCore(unixTsMs, rollbackAllowance) {
    const MAX_COUNTER = 4398046511103;
    if (!Number.isInteger(unixTsMs) || unixTsMs < 1 || unixTsMs > 281474976710655) throw new RangeError("`unixTsMs` must be a 48-bit positive integer");
    if (rollbackAllowance < 0 || rollbackAllowance > 281474976710655) throw new RangeError("`rollbackAllowance` out of reasonable range");
    if (unixTsMs > this.timestamp) {
      this.timestamp = unixTsMs;
      this.resetCounter();
    } else {
      if (!(unixTsMs + rollbackAllowance >= this.timestamp)) return;
      this.counter++;
      if (this.counter > MAX_COUNTER) {
        this.timestamp++;
        this.resetCounter();
      }
    }
    return UUID.fromFieldsV7(this.timestamp, Math.trunc(this.counter / 2 ** 30), this.counter & 2 ** 30 - 1, this.random.nextUint32());
  }
  resetCounter() {
    this.counter = 1024 * this.random.nextUint32() + (1023 & this.random.nextUint32());
  }
  generateV4() {
    const bytes = new Uint8Array(Uint32Array.of(this.random.nextUint32(), this.random.nextUint32(), this.random.nextUint32(), this.random.nextUint32()).buffer);
    bytes[6] = 64 | bytes[6] >>> 4;
    bytes[8] = 128 | bytes[8] >>> 2;
    return UUID.ofInner(bytes);
  }
};
var getDefaultRandom = /* @__PURE__ */ __name(() => ({
  nextUint32: /* @__PURE__ */ __name(() => 65536 * Math.trunc(65536 * Math.random()) + Math.trunc(65536 * Math.random()), "nextUint32")
}), "getDefaultRandom");
var defaultGenerator;
var uuidv7 = /* @__PURE__ */ __name(() => uuidv7obj().toString(), "uuidv7");
var uuidv7obj = /* @__PURE__ */ __name(() => (defaultGenerator || (defaultGenerator = new V7Generator())).generate(), "uuidv7obj");

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/index.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/bot-detection.mjs
init_esm();
var DEFAULT_BLOCKED_UA_STRS = [
  "amazonbot",
  "amazonproductbot",
  "app.hypefactors.com",
  "applebot",
  "archive.org_bot",
  "awariobot",
  "backlinksextendedbot",
  "baiduspider",
  "bingbot",
  "bingpreview",
  "chrome-lighthouse",
  "dataforseobot",
  "deepscan",
  "duckduckbot",
  "facebookexternal",
  "facebookcatalog",
  "http://yandex.com/bots",
  "hubspot",
  "ia_archiver",
  "leikibot",
  "linkedinbot",
  "meta-externalagent",
  "mj12bot",
  "msnbot",
  "nessus",
  "petalbot",
  "pinterest",
  "prerender",
  "rogerbot",
  "screaming frog",
  "sebot-wa",
  "sitebulb",
  "slackbot",
  "slurp",
  "trendictionbot",
  "turnitin",
  "twitterbot",
  "vercel-screenshot",
  "vercelbot",
  "yahoo! slurp",
  "yandexbot",
  "zoombot",
  "bot.htm",
  "bot.php",
  "(bot;",
  "bot/",
  "crawler",
  "ahrefsbot",
  "ahrefssiteaudit",
  "semrushbot",
  "siteauditbot",
  "splitsignalbot",
  "gptbot",
  "oai-searchbot",
  "chatgpt-user",
  "perplexitybot",
  "better uptime bot",
  "sentryuptimebot",
  "uptimerobot",
  "headlesschrome",
  "cypress",
  "google-hoteladsverifier",
  "adsbot-google",
  "apis-google",
  "duplexweb-google",
  "feedfetcher-google",
  "google favicon",
  "google web preview",
  "google-read-aloud",
  "googlebot",
  "googleother",
  "google-cloudvertexbot",
  "googleweblight",
  "mediapartners-google",
  "storebot-google",
  "google-inspectiontool",
  "bytespider"
];
var isBlockedUA = /* @__PURE__ */ __name(function(ua, customBlockedUserAgents = []) {
  if (!ua) return false;
  const uaLower = ua.toLowerCase();
  return DEFAULT_BLOCKED_UA_STRS.concat(customBlockedUserAgents).some((blockedUA) => {
    const blockedUaLower = blockedUA.toLowerCase();
    return -1 !== uaLower.indexOf(blockedUaLower);
  });
}, "isBlockedUA");

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/bucketed-rate-limiter.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/number-utils.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/type-utils.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/types.mjs
init_esm();
var types_PostHogPersistedProperty = /* @__PURE__ */ function(PostHogPersistedProperty) {
  PostHogPersistedProperty["AnonymousId"] = "anonymous_id";
  PostHogPersistedProperty["DistinctId"] = "distinct_id";
  PostHogPersistedProperty["Props"] = "props";
  PostHogPersistedProperty["FeatureFlagDetails"] = "feature_flag_details";
  PostHogPersistedProperty["FeatureFlags"] = "feature_flags";
  PostHogPersistedProperty["FeatureFlagPayloads"] = "feature_flag_payloads";
  PostHogPersistedProperty["BootstrapFeatureFlagDetails"] = "bootstrap_feature_flag_details";
  PostHogPersistedProperty["BootstrapFeatureFlags"] = "bootstrap_feature_flags";
  PostHogPersistedProperty["BootstrapFeatureFlagPayloads"] = "bootstrap_feature_flag_payloads";
  PostHogPersistedProperty["OverrideFeatureFlags"] = "override_feature_flags";
  PostHogPersistedProperty["Queue"] = "queue";
  PostHogPersistedProperty["OptedOut"] = "opted_out";
  PostHogPersistedProperty["SessionId"] = "session_id";
  PostHogPersistedProperty["SessionStartTimestamp"] = "session_start_timestamp";
  PostHogPersistedProperty["SessionLastTimestamp"] = "session_timestamp";
  PostHogPersistedProperty["PersonProperties"] = "person_properties";
  PostHogPersistedProperty["GroupProperties"] = "group_properties";
  PostHogPersistedProperty["InstalledAppBuild"] = "installed_app_build";
  PostHogPersistedProperty["InstalledAppVersion"] = "installed_app_version";
  PostHogPersistedProperty["SessionReplay"] = "session_replay";
  PostHogPersistedProperty["SurveyLastSeenDate"] = "survey_last_seen_date";
  PostHogPersistedProperty["SurveysSeen"] = "surveys_seen";
  PostHogPersistedProperty["Surveys"] = "surveys";
  PostHogPersistedProperty["RemoteConfig"] = "remote_config";
  PostHogPersistedProperty["FlagsEndpointWasHit"] = "flags_endpoint_was_hit";
  return PostHogPersistedProperty;
}({});

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/string-utils.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/type-utils.mjs
var nativeIsArray = Array.isArray;
var ObjProto = Object.prototype;
var type_utils_hasOwnProperty = ObjProto.hasOwnProperty;
var type_utils_toString = ObjProto.toString;
var isArray = nativeIsArray || function(obj) {
  return "[object Array]" === type_utils_toString.call(obj);
};
var isObject = /* @__PURE__ */ __name((x) => x === Object(x) && !isArray(x), "isObject");
var isUndefined = /* @__PURE__ */ __name((x) => void 0 === x, "isUndefined");
var isString = /* @__PURE__ */ __name((x) => "[object String]" == type_utils_toString.call(x), "isString");
var isEmptyString = /* @__PURE__ */ __name((x) => isString(x) && 0 === x.trim().length, "isEmptyString");
var isNumber = /* @__PURE__ */ __name((x) => "[object Number]" == type_utils_toString.call(x) && x === x, "isNumber");
var isPlainError = /* @__PURE__ */ __name((x) => x instanceof Error, "isPlainError");
function isPrimitive(value) {
  return null === value || "object" != typeof value;
}
__name(isPrimitive, "isPrimitive");
function isBuiltin(candidate, className) {
  return Object.prototype.toString.call(candidate) === `[object ${className}]`;
}
__name(isBuiltin, "isBuiltin");
function isErrorEvent(event) {
  return isBuiltin(event, "ErrorEvent");
}
__name(isErrorEvent, "isErrorEvent");
function isEvent(candidate) {
  return !isUndefined(Event) && isInstanceOf(candidate, Event);
}
__name(isEvent, "isEvent");
function isPlainObject(candidate) {
  return isBuiltin(candidate, "Object");
}
__name(isPlainObject, "isPlainObject");
function isInstanceOf(candidate, base) {
  try {
    return candidate instanceof base;
  } catch {
    return false;
  }
}
__name(isInstanceOf, "isInstanceOf");

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/number-utils.mjs
function clampToRange(value, min, max, logger, fallbackValue) {
  if (min > max) {
    logger.warn("min cannot be greater than max.");
    min = max;
  }
  if (isNumber(value)) if (value > max) {
    logger.warn(" cannot be  greater than max: " + max + ". Using max value instead.");
    return max;
  } else {
    if (!(value < min)) return value;
    logger.warn(" cannot be less than min: " + min + ". Using min value instead.");
    return min;
  }
  logger.warn(" must be a number. using max or fallback. max: " + max + ", fallback: " + fallbackValue);
  return clampToRange(fallbackValue || max, min, max, logger);
}
__name(clampToRange, "clampToRange");

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/bucketed-rate-limiter.mjs
var ONE_DAY_IN_MS = 864e5;
var BucketedRateLimiter = class {
  static {
    __name(this, "BucketedRateLimiter");
  }
  constructor(options) {
    this._buckets = {};
    this._onBucketRateLimited = options._onBucketRateLimited;
    this._bucketSize = clampToRange(options.bucketSize, 0, 100, options._logger);
    this._refillRate = clampToRange(options.refillRate, 0, this._bucketSize, options._logger);
    this._refillInterval = clampToRange(options.refillInterval, 0, ONE_DAY_IN_MS, options._logger);
  }
  _applyRefill(bucket, now) {
    const elapsedMs = now - bucket.lastAccess;
    const refillIntervals = Math.floor(elapsedMs / this._refillInterval);
    if (refillIntervals > 0) {
      const tokensToAdd = refillIntervals * this._refillRate;
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this._bucketSize);
      bucket.lastAccess = bucket.lastAccess + refillIntervals * this._refillInterval;
    }
  }
  consumeRateLimit(key) {
    const now = Date.now();
    const keyStr = String(key);
    let bucket = this._buckets[keyStr];
    if (bucket) this._applyRefill(bucket, now);
    else {
      bucket = {
        tokens: this._bucketSize,
        lastAccess: now
      };
      this._buckets[keyStr] = bucket;
    }
    if (0 === bucket.tokens) return true;
    bucket.tokens--;
    if (0 === bucket.tokens) this._onBucketRateLimited?.(key);
    return 0 === bucket.tokens;
  }
  stop() {
    this._buckets = {};
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/promise-queue.mjs
init_esm();
var PromiseQueue = class {
  static {
    __name(this, "PromiseQueue");
  }
  add(promise) {
    const promiseUUID = uuidv7();
    this.promiseByIds[promiseUUID] = promise;
    promise.catch(() => {
    }).finally(() => {
      delete this.promiseByIds[promiseUUID];
    });
    return promise;
  }
  async join() {
    let promises = Object.values(this.promiseByIds);
    let length = promises.length;
    while (length > 0) {
      await Promise.all(promises);
      promises = Object.values(this.promiseByIds);
      length = promises.length;
    }
  }
  get length() {
    return Object.keys(this.promiseByIds).length;
  }
  constructor() {
    this.promiseByIds = {};
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/logger.mjs
init_esm();
function createConsole(consoleLike = console) {
  const lockedMethods = {
    log: consoleLike.log.bind(consoleLike),
    warn: consoleLike.warn.bind(consoleLike),
    error: consoleLike.error.bind(consoleLike),
    debug: consoleLike.debug.bind(consoleLike)
  };
  return lockedMethods;
}
__name(createConsole, "createConsole");
var _createLogger = /* @__PURE__ */ __name((prefix, maybeCall, consoleLike) => {
  function _log(level, ...args) {
    maybeCall(() => {
      const consoleMethod = consoleLike[level];
      consoleMethod(prefix, ...args);
    });
  }
  __name(_log, "_log");
  const logger = {
    info: /* @__PURE__ */ __name((...args) => {
      _log("log", ...args);
    }, "info"),
    warn: /* @__PURE__ */ __name((...args) => {
      _log("warn", ...args);
    }, "warn"),
    error: /* @__PURE__ */ __name((...args) => {
      _log("error", ...args);
    }, "error"),
    critical: /* @__PURE__ */ __name((...args) => {
      consoleLike["error"](prefix, ...args);
    }, "critical"),
    createLogger: /* @__PURE__ */ __name((additionalPrefix) => _createLogger(`${prefix} ${additionalPrefix}`, maybeCall, consoleLike), "createLogger")
  };
  return logger;
}, "_createLogger");
var passThrough = /* @__PURE__ */ __name((fn) => fn(), "passThrough");
function createLogger(prefix, maybeCall = passThrough) {
  return _createLogger(prefix, maybeCall, createConsole());
}
__name(createLogger, "createLogger");

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/user-agent-utils.mjs
init_esm();
var MOBILE = "Mobile";
var IOS = "iOS";
var ANDROID = "Android";
var TABLET = "Tablet";
var ANDROID_TABLET = ANDROID + " " + TABLET;
var APPLE = "Apple";
var APPLE_WATCH = APPLE + " Watch";
var SAFARI = "Safari";
var BLACKBERRY = "BlackBerry";
var SAMSUNG = "Samsung";
var SAMSUNG_BROWSER = SAMSUNG + "Browser";
var SAMSUNG_INTERNET = SAMSUNG + " Internet";
var CHROME = "Chrome";
var CHROME_OS = CHROME + " OS";
var CHROME_IOS = CHROME + " " + IOS;
var INTERNET_EXPLORER = "Internet Explorer";
var INTERNET_EXPLORER_MOBILE = INTERNET_EXPLORER + " " + MOBILE;
var OPERA = "Opera";
var OPERA_MINI = OPERA + " Mini";
var EDGE = "Edge";
var MICROSOFT_EDGE = "Microsoft " + EDGE;
var FIREFOX = "Firefox";
var FIREFOX_IOS = FIREFOX + " " + IOS;
var NINTENDO = "Nintendo";
var PLAYSTATION = "PlayStation";
var XBOX = "Xbox";
var ANDROID_MOBILE = ANDROID + " " + MOBILE;
var MOBILE_SAFARI = MOBILE + " " + SAFARI;
var WINDOWS = "Windows";
var WINDOWS_PHONE = WINDOWS + " Phone";
var GENERIC = "Generic";
var GENERIC_MOBILE = GENERIC + " " + MOBILE.toLowerCase();
var GENERIC_TABLET = GENERIC + " " + TABLET.toLowerCase();
var KONQUEROR = "Konqueror";
var BROWSER_VERSION_REGEX_SUFFIX = "(\\d+(\\.\\d+)?)";
var DEFAULT_BROWSER_VERSION_REGEX = new RegExp("Version/" + BROWSER_VERSION_REGEX_SUFFIX);
var XBOX_REGEX = new RegExp(XBOX, "i");
var PLAYSTATION_REGEX = new RegExp(PLAYSTATION + " \\w+", "i");
var NINTENDO_REGEX = new RegExp(NINTENDO + " \\w+", "i");
var BLACKBERRY_REGEX = new RegExp(BLACKBERRY + "|PlayBook|BB10", "i");
var windowsVersionMap = {
  "NT3.51": "NT 3.11",
  "NT4.0": "NT 4.0",
  "5.0": "2000",
  "5.1": "XP",
  "5.2": "XP",
  "6.0": "Vista",
  "6.1": "7",
  "6.2": "8",
  "6.3": "8.1",
  "6.4": "10",
  "10.0": "10"
};
var versionRegexes = {
  [INTERNET_EXPLORER_MOBILE]: [
    new RegExp("rv:" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [MICROSOFT_EDGE]: [
    new RegExp(EDGE + "?\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [CHROME]: [
    new RegExp("(" + CHROME + "|CrMo)\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [CHROME_IOS]: [
    new RegExp("CriOS\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  "UC Browser": [
    new RegExp("(UCBrowser|UCWEB)\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [SAFARI]: [
    DEFAULT_BROWSER_VERSION_REGEX
  ],
  [MOBILE_SAFARI]: [
    DEFAULT_BROWSER_VERSION_REGEX
  ],
  [OPERA]: [
    new RegExp("(" + OPERA + "|OPR)\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [FIREFOX]: [
    new RegExp(FIREFOX + "\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [FIREFOX_IOS]: [
    new RegExp("FxiOS\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [KONQUEROR]: [
    new RegExp("Konqueror[:/]?" + BROWSER_VERSION_REGEX_SUFFIX, "i")
  ],
  [BLACKBERRY]: [
    new RegExp(BLACKBERRY + " " + BROWSER_VERSION_REGEX_SUFFIX),
    DEFAULT_BROWSER_VERSION_REGEX
  ],
  [ANDROID_MOBILE]: [
    new RegExp("android\\s" + BROWSER_VERSION_REGEX_SUFFIX, "i")
  ],
  [SAMSUNG_INTERNET]: [
    new RegExp(SAMSUNG_BROWSER + "\\/" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  [INTERNET_EXPLORER]: [
    new RegExp("(rv:|MSIE )" + BROWSER_VERSION_REGEX_SUFFIX)
  ],
  Mozilla: [
    new RegExp("rv:" + BROWSER_VERSION_REGEX_SUFFIX)
  ]
};
var osMatchers = [
  [
    new RegExp(XBOX + "; " + XBOX + " (.*?)[);]", "i"),
    (match) => [
      XBOX,
      match && match[1] || ""
    ]
  ],
  [
    new RegExp(NINTENDO, "i"),
    [
      NINTENDO,
      ""
    ]
  ],
  [
    new RegExp(PLAYSTATION, "i"),
    [
      PLAYSTATION,
      ""
    ]
  ],
  [
    BLACKBERRY_REGEX,
    [
      BLACKBERRY,
      ""
    ]
  ],
  [
    new RegExp(WINDOWS, "i"),
    (_, user_agent) => {
      if (/Phone/.test(user_agent) || /WPDesktop/.test(user_agent)) return [
        WINDOWS_PHONE,
        ""
      ];
      if (new RegExp(MOBILE).test(user_agent) && !/IEMobile\b/.test(user_agent)) return [
        WINDOWS + " " + MOBILE,
        ""
      ];
      const match = /Windows NT ([0-9.]+)/i.exec(user_agent);
      if (match && match[1]) {
        const version2 = match[1];
        let osVersion = windowsVersionMap[version2] || "";
        if (/arm/i.test(user_agent)) osVersion = "RT";
        return [
          WINDOWS,
          osVersion
        ];
      }
      return [
        WINDOWS,
        ""
      ];
    }
  ],
  [
    /((iPhone|iPad|iPod).*?OS (\d+)_(\d+)_?(\d+)?|iPhone)/,
    (match) => {
      if (match && match[3]) {
        const versionParts = [
          match[3],
          match[4],
          match[5] || "0"
        ];
        return [
          IOS,
          versionParts.join(".")
        ];
      }
      return [
        IOS,
        ""
      ];
    }
  ],
  [
    /(watch.*\/(\d+\.\d+\.\d+)|watch os,(\d+\.\d+),)/i,
    (match) => {
      let version2 = "";
      if (match && match.length >= 3) version2 = isUndefined(match[2]) ? match[3] : match[2];
      return [
        "watchOS",
        version2
      ];
    }
  ],
  [
    new RegExp("(" + ANDROID + " (\\d+)\\.(\\d+)\\.?(\\d+)?|" + ANDROID + ")", "i"),
    (match) => {
      if (match && match[2]) {
        const versionParts = [
          match[2],
          match[3],
          match[4] || "0"
        ];
        return [
          ANDROID,
          versionParts.join(".")
        ];
      }
      return [
        ANDROID,
        ""
      ];
    }
  ],
  [
    /Mac OS X (\d+)[_.](\d+)[_.]?(\d+)?/i,
    (match) => {
      const result = [
        "Mac OS X",
        ""
      ];
      if (match && match[1]) {
        const versionParts = [
          match[1],
          match[2],
          match[3] || "0"
        ];
        result[1] = versionParts.join(".");
      }
      return result;
    }
  ],
  [
    /Mac/i,
    [
      "Mac OS X",
      ""
    ]
  ],
  [
    /CrOS/,
    [
      CHROME_OS,
      ""
    ]
  ],
  [
    /Linux|debian/i,
    [
      "Linux",
      ""
    ]
  ]
];

// node_modules/posthog-node/node_modules/@posthog/core/dist/utils/index.mjs
var STRING_FORMAT = "utf8";
function assert(truthyValue, message) {
  if (!truthyValue || "string" != typeof truthyValue || isEmpty(truthyValue)) throw new Error(message);
}
__name(assert, "assert");
function isEmpty(truthyValue) {
  if (0 === truthyValue.trim().length) return true;
  return false;
}
__name(isEmpty, "isEmpty");
function removeTrailingSlash(url) {
  return url?.replace(/\/+$/, "");
}
__name(removeTrailingSlash, "removeTrailingSlash");
async function retriable(fn, props) {
  let lastError = null;
  for (let i = 0; i < props.retryCount + 1; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, props.retryDelay));
    try {
      const res = await fn();
      return res;
    } catch (e) {
      lastError = e;
      if (!props.retryCheck(e)) throw e;
    }
  }
  throw lastError;
}
__name(retriable, "retriable");
function currentISOTime() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(currentISOTime, "currentISOTime");
function safeSetTimeout(fn, timeout) {
  const t = setTimeout(fn, timeout);
  t?.unref && t?.unref();
  return t;
}
__name(safeSetTimeout, "safeSetTimeout");
var isError = /* @__PURE__ */ __name((x) => x instanceof Error, "isError");
function allSettled(promises) {
  return Promise.all(promises.map((p) => (p ?? Promise.resolve()).then((value) => ({
    status: "fulfilled",
    value
  }), (reason) => ({
    status: "rejected",
    reason
  }))));
}
__name(allSettled, "allSettled");

// node_modules/posthog-node/node_modules/@posthog/core/dist/posthog-core.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/posthog-core-stateless.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/eventemitter.mjs
init_esm();
var SimpleEventEmitter = class {
  static {
    __name(this, "SimpleEventEmitter");
  }
  constructor() {
    this.events = {};
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return () => {
      this.events[event] = this.events[event].filter((x) => x !== listener);
    };
  }
  emit(event, payload) {
    for (const listener of this.events[event] || []) listener(payload);
    for (const listener of this.events["*"] || []) listener(event, payload);
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/gzip.mjs
init_esm();
function isGzipSupported() {
  return "CompressionStream" in globalThis;
}
__name(isGzipSupported, "isGzipSupported");
async function gzipCompress(input, isDebug = true) {
  try {
    const dataStream = new Blob([
      input
    ], {
      type: "text/plain"
    }).stream();
    const compressedStream = dataStream.pipeThrough(new CompressionStream("gzip"));
    return await new Response(compressedStream).blob();
  } catch (error) {
    if (isDebug) console.error("Failed to gzip compress data", error);
    return null;
  }
}
__name(gzipCompress, "gzipCompress");

// node_modules/posthog-node/node_modules/@posthog/core/dist/posthog-core-stateless.mjs
var PostHogFetchHttpError = class extends Error {
  static {
    __name(this, "PostHogFetchHttpError");
  }
  constructor(response, reqByteLength) {
    super("HTTP error while fetching PostHog: status=" + response.status + ", reqByteLength=" + reqByteLength), this.response = response, this.reqByteLength = reqByteLength, this.name = "PostHogFetchHttpError";
  }
  get status() {
    return this.response.status;
  }
  get text() {
    return this.response.text();
  }
  get json() {
    return this.response.json();
  }
};
var PostHogFetchNetworkError = class extends Error {
  static {
    __name(this, "PostHogFetchNetworkError");
  }
  constructor(error) {
    super("Network error while fetching PostHog", error instanceof Error ? {
      cause: error
    } : {}), this.error = error, this.name = "PostHogFetchNetworkError";
  }
};
async function logFlushError(err) {
  if (err instanceof PostHogFetchHttpError) {
    let text = "";
    try {
      text = await err.text;
    } catch {
    }
    console.error(`Error while flushing PostHog: message=${err.message}, response body=${text}`, err);
  } else console.error("Error while flushing PostHog", err);
  return Promise.resolve();
}
__name(logFlushError, "logFlushError");
function isPostHogFetchError(err) {
  return "object" == typeof err && (err instanceof PostHogFetchHttpError || err instanceof PostHogFetchNetworkError);
}
__name(isPostHogFetchError, "isPostHogFetchError");
function isPostHogFetchContentTooLargeError(err) {
  return "object" == typeof err && err instanceof PostHogFetchHttpError && 413 === err.status;
}
__name(isPostHogFetchContentTooLargeError, "isPostHogFetchContentTooLargeError");
var PostHogCoreStateless = class {
  static {
    __name(this, "PostHogCoreStateless");
  }
  constructor(apiKey, options = {}) {
    this.flushPromise = null;
    this.shutdownPromise = null;
    this.promiseQueue = new PromiseQueue();
    this._events = new SimpleEventEmitter();
    this._isInitialized = false;
    assert(apiKey, "You must pass your PostHog project's api key.");
    this.apiKey = apiKey;
    this.host = removeTrailingSlash(options.host || "https://us.i.posthog.com");
    this.flushAt = options.flushAt ? Math.max(options.flushAt, 1) : 20;
    this.maxBatchSize = Math.max(this.flushAt, options.maxBatchSize ?? 100);
    this.maxQueueSize = Math.max(this.flushAt, options.maxQueueSize ?? 1e3);
    this.flushInterval = options.flushInterval ?? 1e4;
    this.preloadFeatureFlags = options.preloadFeatureFlags ?? true;
    this.defaultOptIn = options.defaultOptIn ?? true;
    this.disableSurveys = options.disableSurveys ?? false;
    this._retryOptions = {
      retryCount: options.fetchRetryCount ?? 3,
      retryDelay: options.fetchRetryDelay ?? 3e3,
      retryCheck: isPostHogFetchError
    };
    this.requestTimeout = options.requestTimeout ?? 1e4;
    this.featureFlagsRequestTimeoutMs = options.featureFlagsRequestTimeoutMs ?? 3e3;
    this.remoteConfigRequestTimeoutMs = options.remoteConfigRequestTimeoutMs ?? 3e3;
    this.disableGeoip = options.disableGeoip ?? true;
    this.disabled = options.disabled ?? false;
    this.historicalMigration = options?.historicalMigration ?? false;
    this.evaluationEnvironments = options?.evaluationEnvironments;
    this._initPromise = Promise.resolve();
    this._isInitialized = true;
    this._logger = createLogger("[PostHog]", this.logMsgIfDebug.bind(this));
    this.disableCompression = !isGzipSupported() || (options?.disableCompression ?? false);
  }
  logMsgIfDebug(fn) {
    if (this.isDebug) fn();
  }
  wrap(fn) {
    if (this.disabled) return void this._logger.warn("The client is disabled");
    if (this._isInitialized) return fn();
    this._initPromise.then(() => fn());
  }
  getCommonEventProperties() {
    return {
      $lib: this.getLibraryId(),
      $lib_version: this.getLibraryVersion()
    };
  }
  get optedOut() {
    return this.getPersistedProperty(types_PostHogPersistedProperty.OptedOut) ?? !this.defaultOptIn;
  }
  async optIn() {
    this.wrap(() => {
      this.setPersistedProperty(types_PostHogPersistedProperty.OptedOut, false);
    });
  }
  async optOut() {
    this.wrap(() => {
      this.setPersistedProperty(types_PostHogPersistedProperty.OptedOut, true);
    });
  }
  on(event, cb) {
    return this._events.on(event, cb);
  }
  debug(enabled = true) {
    this.removeDebugCallback?.();
    if (enabled) {
      const removeDebugCallback = this.on("*", (event, payload) => this._logger.info(event, payload));
      this.removeDebugCallback = () => {
        removeDebugCallback();
        this.removeDebugCallback = void 0;
      };
    }
  }
  get isDebug() {
    return !!this.removeDebugCallback;
  }
  get isDisabled() {
    return this.disabled;
  }
  buildPayload(payload) {
    return {
      distinct_id: payload.distinct_id,
      event: payload.event,
      properties: {
        ...payload.properties || {},
        ...this.getCommonEventProperties()
      }
    };
  }
  addPendingPromise(promise) {
    return this.promiseQueue.add(promise);
  }
  identifyStateless(distinctId, properties, options) {
    this.wrap(() => {
      const payload = {
        ...this.buildPayload({
          distinct_id: distinctId,
          event: "$identify",
          properties
        })
      };
      this.enqueue("identify", payload, options);
    });
  }
  async identifyStatelessImmediate(distinctId, properties, options) {
    const payload = {
      ...this.buildPayload({
        distinct_id: distinctId,
        event: "$identify",
        properties
      })
    };
    await this.sendImmediate("identify", payload, options);
  }
  captureStateless(distinctId, event, properties, options) {
    this.wrap(() => {
      const payload = this.buildPayload({
        distinct_id: distinctId,
        event,
        properties
      });
      this.enqueue("capture", payload, options);
    });
  }
  async captureStatelessImmediate(distinctId, event, properties, options) {
    const payload = this.buildPayload({
      distinct_id: distinctId,
      event,
      properties
    });
    await this.sendImmediate("capture", payload, options);
  }
  aliasStateless(alias, distinctId, properties, options) {
    this.wrap(() => {
      const payload = this.buildPayload({
        event: "$create_alias",
        distinct_id: distinctId,
        properties: {
          ...properties || {},
          distinct_id: distinctId,
          alias
        }
      });
      this.enqueue("alias", payload, options);
    });
  }
  async aliasStatelessImmediate(alias, distinctId, properties, options) {
    const payload = this.buildPayload({
      event: "$create_alias",
      distinct_id: distinctId,
      properties: {
        ...properties || {},
        distinct_id: distinctId,
        alias
      }
    });
    await this.sendImmediate("alias", payload, options);
  }
  groupIdentifyStateless(groupType, groupKey, groupProperties, options, distinctId, eventProperties) {
    this.wrap(() => {
      const payload = this.buildPayload({
        distinct_id: distinctId || `$${groupType}_${groupKey}`,
        event: "$groupidentify",
        properties: {
          $group_type: groupType,
          $group_key: groupKey,
          $group_set: groupProperties || {},
          ...eventProperties || {}
        }
      });
      this.enqueue("capture", payload, options);
    });
  }
  async getRemoteConfig() {
    await this._initPromise;
    let host = this.host;
    if ("https://us.i.posthog.com" === host) host = "https://us-assets.i.posthog.com";
    else if ("https://eu.i.posthog.com" === host) host = "https://eu-assets.i.posthog.com";
    const url = `${host}/array/${this.apiKey}/config`;
    const fetchOptions = {
      method: "GET",
      headers: {
        ...this.getCustomHeaders(),
        "Content-Type": "application/json"
      }
    };
    return this.fetchWithRetry(url, fetchOptions, {
      retryCount: 0
    }, this.remoteConfigRequestTimeoutMs).then((response) => response.json()).catch((error) => {
      this._logger.error("Remote config could not be loaded", error);
      this._events.emit("error", error);
    });
  }
  async getFlags(distinctId, groups = {}, personProperties = {}, groupProperties = {}, extraPayload = {}, fetchConfig = true) {
    await this._initPromise;
    const configParam = fetchConfig ? "&config=true" : "";
    const url = `${this.host}/flags/?v=2${configParam}`;
    const requestData = {
      token: this.apiKey,
      distinct_id: distinctId,
      groups,
      person_properties: personProperties,
      group_properties: groupProperties,
      ...extraPayload
    };
    if (this.evaluationEnvironments && this.evaluationEnvironments.length > 0) requestData.evaluation_environments = this.evaluationEnvironments;
    const fetchOptions = {
      method: "POST",
      headers: {
        ...this.getCustomHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestData)
    };
    this._logger.info("Flags URL", url);
    return this.fetchWithRetry(url, fetchOptions, {
      retryCount: 0
    }, this.featureFlagsRequestTimeoutMs).then((response) => response.json()).then((response) => normalizeFlagsResponse(response)).catch((error) => {
      this._events.emit("error", error);
    });
  }
  async getFeatureFlagStateless(key, distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip) {
    await this._initPromise;
    const flagDetailResponse = await this.getFeatureFlagDetailStateless(key, distinctId, groups, personProperties, groupProperties, disableGeoip);
    if (void 0 === flagDetailResponse) return {
      response: void 0,
      requestId: void 0
    };
    let response = getFeatureFlagValue(flagDetailResponse.response);
    if (void 0 === response) response = false;
    return {
      response,
      requestId: flagDetailResponse.requestId
    };
  }
  async getFeatureFlagDetailStateless(key, distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip) {
    await this._initPromise;
    const flagsResponse = await this.getFeatureFlagDetailsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, [
      key
    ]);
    if (void 0 === flagsResponse) return;
    const featureFlags = flagsResponse.flags;
    const flagDetail = featureFlags[key];
    return {
      response: flagDetail,
      requestId: flagsResponse.requestId,
      evaluatedAt: flagsResponse.evaluatedAt
    };
  }
  async getFeatureFlagPayloadStateless(key, distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip) {
    await this._initPromise;
    const payloads = await this.getFeatureFlagPayloadsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, [
      key
    ]);
    if (!payloads) return;
    const response = payloads[key];
    if (void 0 === response) return null;
    return response;
  }
  async getFeatureFlagPayloadsStateless(distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip, flagKeysToEvaluate) {
    await this._initPromise;
    const payloads = (await this.getFeatureFlagsAndPayloadsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, flagKeysToEvaluate)).payloads;
    return payloads;
  }
  async getFeatureFlagsStateless(distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip, flagKeysToEvaluate) {
    await this._initPromise;
    return await this.getFeatureFlagsAndPayloadsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, flagKeysToEvaluate);
  }
  async getFeatureFlagsAndPayloadsStateless(distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip, flagKeysToEvaluate) {
    await this._initPromise;
    const featureFlagDetails = await this.getFeatureFlagDetailsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, flagKeysToEvaluate);
    if (!featureFlagDetails) return {
      flags: void 0,
      payloads: void 0,
      requestId: void 0
    };
    return {
      flags: featureFlagDetails.featureFlags,
      payloads: featureFlagDetails.featureFlagPayloads,
      requestId: featureFlagDetails.requestId
    };
  }
  async getFeatureFlagDetailsStateless(distinctId, groups = {}, personProperties = {}, groupProperties = {}, disableGeoip, flagKeysToEvaluate) {
    await this._initPromise;
    const extraPayload = {};
    if (disableGeoip ?? this.disableGeoip) extraPayload["geoip_disable"] = true;
    if (flagKeysToEvaluate) extraPayload["flag_keys_to_evaluate"] = flagKeysToEvaluate;
    const flagsResponse = await this.getFlags(distinctId, groups, personProperties, groupProperties, extraPayload);
    if (void 0 === flagsResponse) return;
    if (flagsResponse.errorsWhileComputingFlags) console.error("[FEATURE FLAGS] Error while computing feature flags, some flags may be missing or incorrect. Learn more at https://posthog.com/docs/feature-flags/best-practices");
    if (flagsResponse.quotaLimited?.includes("feature_flags")) {
      console.warn("[FEATURE FLAGS] Feature flags quota limit exceeded - feature flags unavailable. Learn more about billing limits at https://posthog.com/docs/billing/limits-alerts");
      return {
        flags: {},
        featureFlags: {},
        featureFlagPayloads: {},
        requestId: flagsResponse?.requestId,
        quotaLimited: flagsResponse.quotaLimited
      };
    }
    return flagsResponse;
  }
  async getSurveysStateless() {
    await this._initPromise;
    if (true === this.disableSurveys) {
      this._logger.info("Loading surveys is disabled.");
      return [];
    }
    const url = `${this.host}/api/surveys/?token=${this.apiKey}`;
    const fetchOptions = {
      method: "GET",
      headers: {
        ...this.getCustomHeaders(),
        "Content-Type": "application/json"
      }
    };
    const response = await this.fetchWithRetry(url, fetchOptions).then((response2) => {
      if (200 !== response2.status || !response2.json) {
        const msg = `Surveys API could not be loaded: ${response2.status}`;
        const error = new Error(msg);
        this._logger.error(error);
        this._events.emit("error", new Error(msg));
        return;
      }
      return response2.json();
    }).catch((error) => {
      this._logger.error("Surveys API could not be loaded", error);
      this._events.emit("error", error);
    });
    const newSurveys = response?.surveys;
    if (newSurveys) this._logger.info("Surveys fetched from API: ", JSON.stringify(newSurveys));
    return newSurveys ?? [];
  }
  get props() {
    if (!this._props) this._props = this.getPersistedProperty(types_PostHogPersistedProperty.Props);
    return this._props || {};
  }
  set props(val) {
    this._props = val;
  }
  async register(properties) {
    this.wrap(() => {
      this.props = {
        ...this.props,
        ...properties
      };
      this.setPersistedProperty(types_PostHogPersistedProperty.Props, this.props);
    });
  }
  async unregister(property) {
    this.wrap(() => {
      delete this.props[property];
      this.setPersistedProperty(types_PostHogPersistedProperty.Props, this.props);
    });
  }
  enqueue(type, _message, options) {
    this.wrap(() => {
      if (this.optedOut) return void this._events.emit(type, "Library is disabled. Not sending event. To re-enable, call posthog.optIn()");
      const message = this.prepareMessage(type, _message, options);
      const queue = this.getPersistedProperty(types_PostHogPersistedProperty.Queue) || [];
      if (queue.length >= this.maxQueueSize) {
        queue.shift();
        this._logger.info("Queue is full, the oldest event is dropped.");
      }
      queue.push({
        message
      });
      this.setPersistedProperty(types_PostHogPersistedProperty.Queue, queue);
      this._events.emit(type, message);
      if (queue.length >= this.flushAt) this.flushBackground();
      if (this.flushInterval && !this._flushTimer) this._flushTimer = safeSetTimeout(() => this.flushBackground(), this.flushInterval);
    });
  }
  async sendImmediate(type, _message, options) {
    if (this.disabled) return void this._logger.warn("The client is disabled");
    if (!this._isInitialized) await this._initPromise;
    if (this.optedOut) return void this._events.emit(type, "Library is disabled. Not sending event. To re-enable, call posthog.optIn()");
    const data = {
      api_key: this.apiKey,
      batch: [
        this.prepareMessage(type, _message, options)
      ],
      sent_at: currentISOTime()
    };
    if (this.historicalMigration) data.historical_migration = true;
    const payload = JSON.stringify(data);
    const url = `${this.host}/batch/`;
    const gzippedPayload = this.disableCompression ? null : await gzipCompress(payload, this.isDebug);
    const fetchOptions = {
      method: "POST",
      headers: {
        ...this.getCustomHeaders(),
        "Content-Type": "application/json",
        ...null !== gzippedPayload && {
          "Content-Encoding": "gzip"
        }
      },
      body: gzippedPayload || payload
    };
    try {
      await this.fetchWithRetry(url, fetchOptions);
    } catch (err) {
      this._events.emit("error", err);
    }
  }
  prepareMessage(type, _message, options) {
    const message = {
      ..._message,
      type,
      library: this.getLibraryId(),
      library_version: this.getLibraryVersion(),
      timestamp: options?.timestamp ? options?.timestamp : currentISOTime(),
      uuid: options?.uuid ? options.uuid : uuidv7()
    };
    const addGeoipDisableProperty = options?.disableGeoip ?? this.disableGeoip;
    if (addGeoipDisableProperty) {
      if (!message.properties) message.properties = {};
      message["properties"]["$geoip_disable"] = true;
    }
    if (message.distinctId) {
      message.distinct_id = message.distinctId;
      delete message.distinctId;
    }
    return message;
  }
  clearFlushTimer() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = void 0;
    }
  }
  flushBackground() {
    this.flush().catch(async (err) => {
      await logFlushError(err);
    });
  }
  async flush() {
    const nextFlushPromise = allSettled([
      this.flushPromise
    ]).then(() => this._flush());
    this.flushPromise = nextFlushPromise;
    this.addPendingPromise(nextFlushPromise);
    allSettled([
      nextFlushPromise
    ]).then(() => {
      if (this.flushPromise === nextFlushPromise) this.flushPromise = null;
    });
    return nextFlushPromise;
  }
  getCustomHeaders() {
    const customUserAgent = this.getCustomUserAgent();
    const headers = {};
    if (customUserAgent && "" !== customUserAgent) headers["User-Agent"] = customUserAgent;
    return headers;
  }
  async _flush() {
    this.clearFlushTimer();
    await this._initPromise;
    let queue = this.getPersistedProperty(types_PostHogPersistedProperty.Queue) || [];
    if (!queue.length) return;
    const sentMessages = [];
    const originalQueueLength = queue.length;
    while (queue.length > 0 && sentMessages.length < originalQueueLength) {
      const batchItems = queue.slice(0, this.maxBatchSize);
      const batchMessages = batchItems.map((item) => item.message);
      const persistQueueChange = /* @__PURE__ */ __name(() => {
        const refreshedQueue = this.getPersistedProperty(types_PostHogPersistedProperty.Queue) || [];
        const newQueue = refreshedQueue.slice(batchItems.length);
        this.setPersistedProperty(types_PostHogPersistedProperty.Queue, newQueue);
        queue = newQueue;
      }, "persistQueueChange");
      const data = {
        api_key: this.apiKey,
        batch: batchMessages,
        sent_at: currentISOTime()
      };
      if (this.historicalMigration) data.historical_migration = true;
      const payload = JSON.stringify(data);
      const url = `${this.host}/batch/`;
      const gzippedPayload = this.disableCompression ? null : await gzipCompress(payload, this.isDebug);
      const fetchOptions = {
        method: "POST",
        headers: {
          ...this.getCustomHeaders(),
          "Content-Type": "application/json",
          ...null !== gzippedPayload && {
            "Content-Encoding": "gzip"
          }
        },
        body: gzippedPayload || payload
      };
      const retryOptions = {
        retryCheck: /* @__PURE__ */ __name((err) => {
          if (isPostHogFetchContentTooLargeError(err)) return false;
          return isPostHogFetchError(err);
        }, "retryCheck")
      };
      try {
        await this.fetchWithRetry(url, fetchOptions, retryOptions);
      } catch (err) {
        if (isPostHogFetchContentTooLargeError(err) && batchMessages.length > 1) {
          this.maxBatchSize = Math.max(1, Math.floor(batchMessages.length / 2));
          this._logger.warn(`Received 413 when sending batch of size ${batchMessages.length}, reducing batch size to ${this.maxBatchSize}`);
          continue;
        }
        if (!(err instanceof PostHogFetchNetworkError)) persistQueueChange();
        this._events.emit("error", err);
        throw err;
      }
      persistQueueChange();
      sentMessages.push(...batchMessages);
    }
    this._events.emit("flush", sentMessages);
  }
  async fetchWithRetry(url, options, retryOptions, requestTimeout) {
    AbortSignal.timeout ??= function(ms) {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), ms);
      return ctrl.signal;
    };
    const body = options.body ? options.body : "";
    let reqByteLength = -1;
    try {
      reqByteLength = body instanceof Blob ? body.size : Buffer.byteLength(body, STRING_FORMAT);
    } catch {
      if (body instanceof Blob) reqByteLength = body.size;
      else {
        const encoded = new TextEncoder().encode(body);
        reqByteLength = encoded.length;
      }
    }
    return await retriable(async () => {
      let res = null;
      try {
        res = await this.fetch(url, {
          signal: AbortSignal.timeout(requestTimeout ?? this.requestTimeout),
          ...options
        });
      } catch (e) {
        throw new PostHogFetchNetworkError(e);
      }
      const isNoCors = "no-cors" === options.mode;
      if (!isNoCors && (res.status < 200 || res.status >= 400)) throw new PostHogFetchHttpError(res, reqByteLength);
      return res;
    }, {
      ...this._retryOptions,
      ...retryOptions
    });
  }
  async _shutdown(shutdownTimeoutMs = 3e4) {
    await this._initPromise;
    let hasTimedOut = false;
    this.clearFlushTimer();
    const doShutdown = /* @__PURE__ */ __name(async () => {
      try {
        await this.promiseQueue.join();
        while (true) {
          const queue = this.getPersistedProperty(types_PostHogPersistedProperty.Queue) || [];
          if (0 === queue.length) break;
          await this.flush();
          if (hasTimedOut) break;
        }
      } catch (e) {
        if (!isPostHogFetchError(e)) throw e;
        await logFlushError(e);
      }
    }, "doShutdown");
    return Promise.race([
      new Promise((_, reject) => {
        safeSetTimeout(() => {
          this._logger.error("Timed out while shutting down PostHog");
          hasTimedOut = true;
          reject("Timeout while shutting down PostHog. Some events may not have been sent.");
        }, shutdownTimeoutMs);
      }),
      doShutdown()
    ]);
  }
  async shutdown(shutdownTimeoutMs = 3e4) {
    if (this.shutdownPromise) this._logger.warn("shutdown() called while already shutting down. shutdown() is meant to be called once before process exit - use flush() for per-request cleanup");
    else this.shutdownPromise = this._shutdown(shutdownTimeoutMs).finally(() => {
      this.shutdownPromise = null;
    });
    return this.shutdownPromise;
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/index.mjs
var error_tracking_exports = {};
__export(error_tracking_exports, {
  DOMExceptionCoercer: () => DOMExceptionCoercer,
  ErrorCoercer: () => ErrorCoercer,
  ErrorEventCoercer: () => ErrorEventCoercer,
  ErrorPropertiesBuilder: () => ErrorPropertiesBuilder,
  EventCoercer: () => EventCoercer,
  ObjectCoercer: () => ObjectCoercer,
  PrimitiveCoercer: () => PrimitiveCoercer,
  PromiseRejectionEventCoercer: () => PromiseRejectionEventCoercer,
  ReduceableCache: () => ReduceableCache,
  StringCoercer: () => StringCoercer,
  chromeStackLineParser: () => chromeStackLineParser,
  createDefaultStackParser: () => createDefaultStackParser,
  createStackParser: () => createStackParser,
  geckoStackLineParser: () => geckoStackLineParser,
  nodeStackLineParser: () => nodeStackLineParser,
  opera10StackLineParser: () => opera10StackLineParser,
  opera11StackLineParser: () => opera11StackLineParser,
  reverseAndStripFrames: () => reverseAndStripFrames,
  winjsStackLineParser: () => winjsStackLineParser
});
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/error-properties-builder.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/chunk-ids.mjs
init_esm();
var parsedStackResults;
var lastKeysCount;
var cachedFilenameChunkIds;
function getFilenameToChunkIdMap(stackParser) {
  const chunkIdMap = globalThis._posthogChunkIds;
  if (!chunkIdMap) return;
  const chunkIdKeys = Object.keys(chunkIdMap);
  if (cachedFilenameChunkIds && chunkIdKeys.length === lastKeysCount) return cachedFilenameChunkIds;
  lastKeysCount = chunkIdKeys.length;
  cachedFilenameChunkIds = chunkIdKeys.reduce((acc, stackKey) => {
    if (!parsedStackResults) parsedStackResults = {};
    const result = parsedStackResults[stackKey];
    if (result) acc[result[0]] = result[1];
    else {
      const parsedStack = stackParser(stackKey);
      for (let i = parsedStack.length - 1; i >= 0; i--) {
        const stackFrame = parsedStack[i];
        const filename = stackFrame?.filename;
        const chunkId = chunkIdMap[stackKey];
        if (filename && chunkId) {
          acc[filename] = chunkId;
          parsedStackResults[stackKey] = [
            filename,
            chunkId
          ];
          break;
        }
      }
    }
    return acc;
  }, {});
  return cachedFilenameChunkIds;
}
__name(getFilenameToChunkIdMap, "getFilenameToChunkIdMap");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/error-properties-builder.mjs
var MAX_CAUSE_RECURSION = 4;
var ErrorPropertiesBuilder = class {
  static {
    __name(this, "ErrorPropertiesBuilder");
  }
  constructor(coercers, stackParser, modifiers = []) {
    this.coercers = coercers;
    this.stackParser = stackParser;
    this.modifiers = modifiers;
  }
  buildFromUnknown(input, hint = {}) {
    const providedMechanism = hint && hint.mechanism;
    const mechanism = providedMechanism || {
      handled: true,
      type: "generic"
    };
    const coercingContext = this.buildCoercingContext(mechanism, hint, 0);
    const exceptionWithCause = coercingContext.apply(input);
    const parsingContext = this.buildParsingContext();
    const exceptionWithStack = this.parseStacktrace(exceptionWithCause, parsingContext);
    const exceptionList = this.convertToExceptionList(exceptionWithStack, mechanism);
    return {
      $exception_list: exceptionList,
      $exception_level: "error"
    };
  }
  async modifyFrames(exceptionList) {
    for (const exc of exceptionList) if (exc.stacktrace && exc.stacktrace.frames && isArray(exc.stacktrace.frames)) exc.stacktrace.frames = await this.applyModifiers(exc.stacktrace.frames);
    return exceptionList;
  }
  coerceFallback(ctx) {
    return {
      type: "Error",
      value: "Unknown error",
      stack: ctx.syntheticException?.stack,
      synthetic: true
    };
  }
  parseStacktrace(err, ctx) {
    let cause;
    if (null != err.cause) cause = this.parseStacktrace(err.cause, ctx);
    let stack;
    if ("" != err.stack && null != err.stack) stack = this.applyChunkIds(this.stackParser(err.stack, err.synthetic ? 1 : 0), ctx.chunkIdMap);
    return {
      ...err,
      cause,
      stack
    };
  }
  applyChunkIds(frames, chunkIdMap) {
    return frames.map((frame) => {
      if (frame.filename && chunkIdMap) frame.chunk_id = chunkIdMap[frame.filename];
      return frame;
    });
  }
  applyCoercers(input, ctx) {
    for (const adapter of this.coercers) if (adapter.match(input)) return adapter.coerce(input, ctx);
    return this.coerceFallback(ctx);
  }
  async applyModifiers(frames) {
    let newFrames = frames;
    for (const modifier of this.modifiers) newFrames = await modifier(newFrames);
    return newFrames;
  }
  convertToExceptionList(exceptionWithStack, mechanism) {
    const currentException = {
      type: exceptionWithStack.type,
      value: exceptionWithStack.value,
      mechanism: {
        type: mechanism.type ?? "generic",
        handled: mechanism.handled ?? true,
        synthetic: exceptionWithStack.synthetic ?? false
      }
    };
    if (exceptionWithStack.stack) currentException.stacktrace = {
      type: "raw",
      frames: exceptionWithStack.stack
    };
    const exceptionList = [
      currentException
    ];
    if (null != exceptionWithStack.cause) exceptionList.push(...this.convertToExceptionList(exceptionWithStack.cause, {
      ...mechanism,
      handled: true
    }));
    return exceptionList;
  }
  buildParsingContext() {
    const context = {
      chunkIdMap: getFilenameToChunkIdMap(this.stackParser)
    };
    return context;
  }
  buildCoercingContext(mechanism, hint, depth = 0) {
    const coerce = /* @__PURE__ */ __name((input, depth2) => {
      if (!(depth2 <= MAX_CAUSE_RECURSION)) return;
      {
        const ctx = this.buildCoercingContext(mechanism, hint, depth2);
        return this.applyCoercers(input, ctx);
      }
    }, "coerce");
    const context = {
      ...hint,
      syntheticException: 0 == depth ? hint.syntheticException : void 0,
      mechanism,
      apply: /* @__PURE__ */ __name((input) => coerce(input, depth), "apply"),
      next: /* @__PURE__ */ __name((input) => coerce(input, depth + 1), "next")
    };
    return context;
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/index.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/base.mjs
init_esm();
var UNKNOWN_FUNCTION = "?";
function createFrame(platform, filename, func, lineno, colno) {
  const frame = {
    platform,
    filename,
    function: "<anonymous>" === func ? UNKNOWN_FUNCTION : func,
    in_app: true
  };
  if (!isUndefined(lineno)) frame.lineno = lineno;
  if (!isUndefined(colno)) frame.colno = colno;
  return frame;
}
__name(createFrame, "createFrame");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/chrome.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/safari.mjs
init_esm();
var extractSafariExtensionDetails = /* @__PURE__ */ __name((func, filename) => {
  const isSafariExtension = -1 !== func.indexOf("safari-extension");
  const isSafariWebExtension = -1 !== func.indexOf("safari-web-extension");
  return isSafariExtension || isSafariWebExtension ? [
    -1 !== func.indexOf("@") ? func.split("@")[0] : UNKNOWN_FUNCTION,
    isSafariExtension ? `safari-extension:${filename}` : `safari-web-extension:${filename}`
  ] : [
    func,
    filename
  ];
}, "extractSafariExtensionDetails");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/chrome.mjs
var chromeRegexNoFnName = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i;
var chromeRegex = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
var chromeEvalRegex = /\((\S*)(?::(\d+))(?::(\d+))\)/;
var chromeStackLineParser = /* @__PURE__ */ __name((line, platform) => {
  const noFnParts = chromeRegexNoFnName.exec(line);
  if (noFnParts) {
    const [, filename, line2, col] = noFnParts;
    return createFrame(platform, filename, UNKNOWN_FUNCTION, +line2, +col);
  }
  const parts = chromeRegex.exec(line);
  if (parts) {
    const isEval = parts[2] && 0 === parts[2].indexOf("eval");
    if (isEval) {
      const subMatch = chromeEvalRegex.exec(parts[2]);
      if (subMatch) {
        parts[2] = subMatch[1];
        parts[3] = subMatch[2];
        parts[4] = subMatch[3];
      }
    }
    const [func, filename] = extractSafariExtensionDetails(parts[1] || UNKNOWN_FUNCTION, parts[2]);
    return createFrame(platform, filename, func, parts[3] ? +parts[3] : void 0, parts[4] ? +parts[4] : void 0);
  }
}, "chromeStackLineParser");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/gecko.mjs
init_esm();
var geckoREgex = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
var geckoEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
var geckoStackLineParser = /* @__PURE__ */ __name((line, platform) => {
  const parts = geckoREgex.exec(line);
  if (parts) {
    const isEval = parts[3] && parts[3].indexOf(" > eval") > -1;
    if (isEval) {
      const subMatch = geckoEvalRegex.exec(parts[3]);
      if (subMatch) {
        parts[1] = parts[1] || "eval";
        parts[3] = subMatch[1];
        parts[4] = subMatch[2];
        parts[5] = "";
      }
    }
    let filename = parts[3];
    let func = parts[1] || UNKNOWN_FUNCTION;
    [func, filename] = extractSafariExtensionDetails(func, filename);
    return createFrame(platform, filename, func, parts[4] ? +parts[4] : void 0, parts[5] ? +parts[5] : void 0);
  }
}, "geckoStackLineParser");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/winjs.mjs
init_esm();
var winjsRegex = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:[-a-z]+):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
var winjsStackLineParser = /* @__PURE__ */ __name((line, platform) => {
  const parts = winjsRegex.exec(line);
  return parts ? createFrame(platform, parts[2], parts[1] || UNKNOWN_FUNCTION, +parts[3], parts[4] ? +parts[4] : void 0) : void 0;
}, "winjsStackLineParser");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/opera.mjs
init_esm();
var opera10Regex = / line (\d+).*script (?:in )?(\S+)(?:: in function (\S+))?$/i;
var opera10StackLineParser = /* @__PURE__ */ __name((line, platform) => {
  const parts = opera10Regex.exec(line);
  return parts ? createFrame(platform, parts[2], parts[3] || UNKNOWN_FUNCTION, +parts[1]) : void 0;
}, "opera10StackLineParser");
var opera11Regex = / line (\d+), column (\d+)\s*(?:in (?:<anonymous function: ([^>]+)>|([^)]+))\(.*\))? in (.*):\s*$/i;
var opera11StackLineParser = /* @__PURE__ */ __name((line, platform) => {
  const parts = opera11Regex.exec(line);
  return parts ? createFrame(platform, parts[5], parts[3] || parts[4] || UNKNOWN_FUNCTION, +parts[1], +parts[2]) : void 0;
}, "opera11StackLineParser");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/node.mjs
init_esm();
var FILENAME_MATCH = /^\s*[-]{4,}$/;
var FULL_MATCH = /at (?:async )?(?:(.+?)\s+\()?(?:(.+):(\d+):(\d+)?|([^)]+))\)?/;
var nodeStackLineParser = /* @__PURE__ */ __name((line, platform) => {
  const lineMatch = line.match(FULL_MATCH);
  if (lineMatch) {
    let object;
    let method;
    let functionName;
    let typeName;
    let methodName;
    if (lineMatch[1]) {
      functionName = lineMatch[1];
      let methodStart = functionName.lastIndexOf(".");
      if ("." === functionName[methodStart - 1]) methodStart--;
      if (methodStart > 0) {
        object = functionName.slice(0, methodStart);
        method = functionName.slice(methodStart + 1);
        const objectEnd = object.indexOf(".Module");
        if (objectEnd > 0) {
          functionName = functionName.slice(objectEnd + 1);
          object = object.slice(0, objectEnd);
        }
      }
      typeName = void 0;
    }
    if (method) {
      typeName = object;
      methodName = method;
    }
    if ("<anonymous>" === method) {
      methodName = void 0;
      functionName = void 0;
    }
    if (void 0 === functionName) {
      methodName = methodName || UNKNOWN_FUNCTION;
      functionName = typeName ? `${typeName}.${methodName}` : methodName;
    }
    let filename = lineMatch[2]?.startsWith("file://") ? lineMatch[2].slice(7) : lineMatch[2];
    const isNative = "native" === lineMatch[5];
    if (filename?.match(/\/[A-Z]:/)) filename = filename.slice(1);
    if (!filename && lineMatch[5] && !isNative) filename = lineMatch[5];
    return {
      filename: filename ? decodeURI(filename) : void 0,
      module: void 0,
      function: functionName,
      lineno: _parseIntOrUndefined(lineMatch[3]),
      colno: _parseIntOrUndefined(lineMatch[4]),
      in_app: filenameIsInApp(filename || "", isNative),
      platform
    };
  }
  if (line.match(FILENAME_MATCH)) return {
    filename: line,
    platform
  };
}, "nodeStackLineParser");
function filenameIsInApp(filename, isNative = false) {
  const isInternal = isNative || filename && !filename.startsWith("/") && !filename.match(/^[A-Z]:/) && !filename.startsWith(".") && !filename.match(/^[a-zA-Z]([a-zA-Z0-9.\-+])*:\/\//);
  return !isInternal && void 0 !== filename && !filename.includes("node_modules/");
}
__name(filenameIsInApp, "filenameIsInApp");
function _parseIntOrUndefined(input) {
  return parseInt(input || "", 10) || void 0;
}
__name(_parseIntOrUndefined, "_parseIntOrUndefined");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/parsers/index.mjs
var WEBPACK_ERROR_REGEXP = /\(error: (.*)\)/;
var STACKTRACE_FRAME_LIMIT = 50;
function reverseAndStripFrames(stack) {
  if (!stack.length) return [];
  const localStack = Array.from(stack);
  localStack.reverse();
  return localStack.slice(0, STACKTRACE_FRAME_LIMIT).map((frame) => ({
    ...frame,
    filename: frame.filename || getLastStackFrame(localStack).filename,
    function: frame.function || UNKNOWN_FUNCTION
  }));
}
__name(reverseAndStripFrames, "reverseAndStripFrames");
function getLastStackFrame(arr) {
  return arr[arr.length - 1] || {};
}
__name(getLastStackFrame, "getLastStackFrame");
function createDefaultStackParser() {
  return createStackParser("web:javascript", chromeStackLineParser, geckoStackLineParser);
}
__name(createDefaultStackParser, "createDefaultStackParser");
function createStackParser(platform, ...parsers) {
  return (stack, skipFirstLines = 0) => {
    const frames = [];
    const lines = stack.split("\n");
    for (let i = skipFirstLines; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 1024) continue;
      const cleanedLine = WEBPACK_ERROR_REGEXP.test(line) ? line.replace(WEBPACK_ERROR_REGEXP, "$1") : line;
      if (!cleanedLine.match(/\S*Error: /)) {
        for (const parser of parsers) {
          const frame = parser(cleanedLine, platform);
          if (frame) {
            frames.push(frame);
            break;
          }
        }
        if (frames.length >= STACKTRACE_FRAME_LIMIT) break;
      }
    }
    return reverseAndStripFrames(frames);
  };
}
__name(createStackParser, "createStackParser");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/index.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/dom-exception-coercer.mjs
init_esm();
var DOMExceptionCoercer = class {
  static {
    __name(this, "DOMExceptionCoercer");
  }
  match(err) {
    return this.isDOMException(err) || this.isDOMError(err);
  }
  coerce(err, ctx) {
    const hasStack = isString(err.stack);
    return {
      type: this.getType(err),
      value: this.getValue(err),
      stack: hasStack ? err.stack : void 0,
      cause: err.cause ? ctx.next(err.cause) : void 0,
      synthetic: false
    };
  }
  getType(candidate) {
    return this.isDOMError(candidate) ? "DOMError" : "DOMException";
  }
  getValue(err) {
    const name = err.name || (this.isDOMError(err) ? "DOMError" : "DOMException");
    const message = err.message ? `${name}: ${err.message}` : name;
    return message;
  }
  isDOMException(err) {
    return isBuiltin(err, "DOMException");
  }
  isDOMError(err) {
    return isBuiltin(err, "DOMError");
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/error-coercer.mjs
init_esm();
var ErrorCoercer = class {
  static {
    __name(this, "ErrorCoercer");
  }
  match(err) {
    return isPlainError(err);
  }
  coerce(err, ctx) {
    return {
      type: this.getType(err),
      value: this.getMessage(err, ctx),
      stack: this.getStack(err),
      cause: err.cause ? ctx.next(err.cause) : void 0,
      synthetic: false
    };
  }
  getType(err) {
    return err.name || err.constructor.name;
  }
  getMessage(err, _ctx) {
    const message = err.message;
    if (message.error && "string" == typeof message.error.message) return String(message.error.message);
    return String(message);
  }
  getStack(err) {
    return err.stacktrace || err.stack || void 0;
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/error-event-coercer.mjs
init_esm();
var ErrorEventCoercer = class {
  static {
    __name(this, "ErrorEventCoercer");
  }
  constructor() {
  }
  match(err) {
    return isErrorEvent(err) && void 0 != err.error;
  }
  coerce(err, ctx) {
    const exceptionLike = ctx.apply(err.error);
    if (!exceptionLike) return {
      type: "ErrorEvent",
      value: err.message,
      stack: ctx.syntheticException?.stack,
      synthetic: true
    };
    return exceptionLike;
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/string-coercer.mjs
init_esm();
var ERROR_TYPES_PATTERN = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i;
var StringCoercer = class {
  static {
    __name(this, "StringCoercer");
  }
  match(input) {
    return "string" == typeof input;
  }
  coerce(input, ctx) {
    const [type, value] = this.getInfos(input);
    return {
      type: type ?? "Error",
      value: value ?? input,
      stack: ctx.syntheticException?.stack,
      synthetic: true
    };
  }
  getInfos(candidate) {
    let type = "Error";
    let value = candidate;
    const groups = candidate.match(ERROR_TYPES_PATTERN);
    if (groups) {
      type = groups[1];
      value = groups[2];
    }
    return [
      type,
      value
    ];
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/object-coercer.mjs
init_esm();

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/types.mjs
init_esm();
var severityLevels = [
  "fatal",
  "error",
  "warning",
  "log",
  "info",
  "debug"
];

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/utils.mjs
init_esm();
function extractExceptionKeysForMessage(err, maxLength = 40) {
  const keys = Object.keys(err);
  keys.sort();
  if (!keys.length) return "[object has no keys]";
  for (let i = keys.length; i > 0; i--) {
    const serialized = keys.slice(0, i).join(", ");
    if (!(serialized.length > maxLength)) {
      if (i === keys.length) return serialized;
      return serialized.length <= maxLength ? serialized : `${serialized.slice(0, maxLength)}...`;
    }
  }
  return "";
}
__name(extractExceptionKeysForMessage, "extractExceptionKeysForMessage");

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/object-coercer.mjs
var ObjectCoercer = class {
  static {
    __name(this, "ObjectCoercer");
  }
  match(candidate) {
    return "object" == typeof candidate && null !== candidate;
  }
  coerce(candidate, ctx) {
    const errorProperty = this.getErrorPropertyFromObject(candidate);
    if (errorProperty) return ctx.apply(errorProperty);
    return {
      type: this.getType(candidate),
      value: this.getValue(candidate),
      stack: ctx.syntheticException?.stack,
      level: this.isSeverityLevel(candidate.level) ? candidate.level : "error",
      synthetic: true
    };
  }
  getType(err) {
    return isEvent(err) ? err.constructor.name : "Error";
  }
  getValue(err) {
    if ("name" in err && "string" == typeof err.name) {
      let message = `'${err.name}' captured as exception`;
      if ("message" in err && "string" == typeof err.message) message += ` with message: '${err.message}'`;
      return message;
    }
    if ("message" in err && "string" == typeof err.message) return err.message;
    const className = this.getObjectClassName(err);
    const keys = extractExceptionKeysForMessage(err);
    return `${className && "Object" !== className ? `'${className}'` : "Object"} captured as exception with keys: ${keys}`;
  }
  isSeverityLevel(x) {
    return isString(x) && !isEmptyString(x) && severityLevels.indexOf(x) >= 0;
  }
  getErrorPropertyFromObject(obj) {
    for (const prop in obj) if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      const value = obj[prop];
      if (isError(value)) return value;
    }
  }
  getObjectClassName(obj) {
    try {
      const prototype = Object.getPrototypeOf(obj);
      return prototype ? prototype.constructor.name : void 0;
    } catch (e) {
      return;
    }
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/event-coercer.mjs
init_esm();
var EventCoercer = class {
  static {
    __name(this, "EventCoercer");
  }
  match(err) {
    return isEvent(err);
  }
  coerce(evt, ctx) {
    const constructorName = evt.constructor.name;
    return {
      type: constructorName,
      value: `${constructorName} captured as exception with keys: ${extractExceptionKeysForMessage(evt)}`,
      stack: ctx.syntheticException?.stack,
      synthetic: true
    };
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/primitive-coercer.mjs
init_esm();
var PrimitiveCoercer = class {
  static {
    __name(this, "PrimitiveCoercer");
  }
  match(candidate) {
    return isPrimitive(candidate);
  }
  coerce(value, ctx) {
    return {
      type: "Error",
      value: `Primitive value captured as exception: ${String(value)}`,
      stack: ctx.syntheticException?.stack,
      synthetic: true
    };
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/coercers/promise-rejection-event.mjs
init_esm();
var PromiseRejectionEventCoercer = class {
  static {
    __name(this, "PromiseRejectionEventCoercer");
  }
  match(err) {
    return isBuiltin(err, "PromiseRejectionEvent");
  }
  coerce(err, ctx) {
    const reason = this.getUnhandledRejectionReason(err);
    if (isPrimitive(reason)) return {
      type: "UnhandledRejection",
      value: `Non-Error promise rejection captured with value: ${String(reason)}`,
      stack: ctx.syntheticException?.stack,
      synthetic: true
    };
    return ctx.apply(reason);
  }
  getUnhandledRejectionReason(error) {
    if (isPrimitive(error)) return error;
    try {
      if ("reason" in error) return error.reason;
      if ("detail" in error && "reason" in error.detail) return error.detail.reason;
    } catch {
    }
    return error;
  }
};

// node_modules/posthog-node/node_modules/@posthog/core/dist/error-tracking/utils.mjs
init_esm();
var ReduceableCache = class {
  static {
    __name(this, "ReduceableCache");
  }
  constructor(_maxSize) {
    this._maxSize = _maxSize;
    this._cache = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this._cache.get(key);
    if (void 0 === value) return;
    this._cache.delete(key);
    this._cache.set(key, value);
    return value;
  }
  set(key, value) {
    this._cache.set(key, value);
  }
  reduce() {
    while (this._cache.size >= this._maxSize) {
      const value = this._cache.keys().next().value;
      if (value) this._cache.delete(value);
    }
  }
};

// node_modules/posthog-node/dist/extensions/error-tracking/modifiers/context-lines.node.mjs
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
var LRU_FILE_CONTENTS_CACHE = new error_tracking_exports.ReduceableCache(25);
var LRU_FILE_CONTENTS_FS_READ_FAILED = new error_tracking_exports.ReduceableCache(20);
var DEFAULT_LINES_OF_CONTEXT = 7;
var MAX_CONTEXTLINES_COLNO = 1e3;
var MAX_CONTEXTLINES_LINENO = 1e4;
async function addSourceContext(frames) {
  const filesToLines = {};
  for (let i = frames.length - 1; i >= 0; i--) {
    const frame = frames[i];
    const filename = frame?.filename;
    if (!frame || "string" != typeof filename || "number" != typeof frame.lineno || shouldSkipContextLinesForFile(filename) || shouldSkipContextLinesForFrame(frame)) continue;
    const filesToLinesOutput = filesToLines[filename];
    if (!filesToLinesOutput) filesToLines[filename] = [];
    filesToLines[filename].push(frame.lineno);
  }
  const files = Object.keys(filesToLines);
  if (0 == files.length) return frames;
  const readlinePromises = [];
  for (const file of files) {
    if (LRU_FILE_CONTENTS_FS_READ_FAILED.get(file)) continue;
    const filesToLineRanges = filesToLines[file];
    if (!filesToLineRanges) continue;
    filesToLineRanges.sort((a, b) => a - b);
    const ranges = makeLineReaderRanges(filesToLineRanges);
    if (ranges.every((r) => rangeExistsInContentCache(file, r))) continue;
    const cache = emplace(LRU_FILE_CONTENTS_CACHE, file, {});
    readlinePromises.push(getContextLinesFromFile(file, ranges, cache));
  }
  await Promise.all(readlinePromises).catch(() => {
  });
  if (frames && frames.length > 0) addSourceContextToFrames(frames, LRU_FILE_CONTENTS_CACHE);
  LRU_FILE_CONTENTS_CACHE.reduce();
  return frames;
}
__name(addSourceContext, "addSourceContext");
function getContextLinesFromFile(path, ranges, output) {
  return new Promise((resolve) => {
    const stream = createReadStream(path);
    const lineReaded = createInterface({
      input: stream
    });
    function destroyStreamAndResolve() {
      stream.destroy();
      resolve();
    }
    __name(destroyStreamAndResolve, "destroyStreamAndResolve");
    let lineNumber = 0;
    let currentRangeIndex = 0;
    const range = ranges[currentRangeIndex];
    if (void 0 === range) return void destroyStreamAndResolve();
    let rangeStart = range[0];
    let rangeEnd = range[1];
    function onStreamError() {
      LRU_FILE_CONTENTS_FS_READ_FAILED.set(path, 1);
      lineReaded.close();
      lineReaded.removeAllListeners();
      destroyStreamAndResolve();
    }
    __name(onStreamError, "onStreamError");
    stream.on("error", onStreamError);
    lineReaded.on("error", onStreamError);
    lineReaded.on("close", destroyStreamAndResolve);
    lineReaded.on("line", (line) => {
      lineNumber++;
      if (lineNumber < rangeStart) return;
      output[lineNumber] = snipLine(line, 0);
      if (lineNumber >= rangeEnd) {
        if (currentRangeIndex === ranges.length - 1) {
          lineReaded.close();
          lineReaded.removeAllListeners();
          return;
        }
        currentRangeIndex++;
        const range2 = ranges[currentRangeIndex];
        if (void 0 === range2) {
          lineReaded.close();
          lineReaded.removeAllListeners();
          return;
        }
        rangeStart = range2[0];
        rangeEnd = range2[1];
      }
    });
  });
}
__name(getContextLinesFromFile, "getContextLinesFromFile");
function addSourceContextToFrames(frames, cache) {
  for (const frame of frames) if (frame.filename && void 0 === frame.context_line && "number" == typeof frame.lineno) {
    const contents = cache.get(frame.filename);
    if (void 0 === contents) continue;
    addContextToFrame(frame.lineno, frame, contents);
  }
}
__name(addSourceContextToFrames, "addSourceContextToFrames");
function addContextToFrame(lineno, frame, contents) {
  if (void 0 === frame.lineno || void 0 === contents) return;
  frame.pre_context = [];
  for (let i = makeRangeStart(lineno); i < lineno; i++) {
    const line = contents[i];
    if (void 0 === line) return void clearLineContext(frame);
    frame.pre_context.push(line);
  }
  if (void 0 === contents[lineno]) return void clearLineContext(frame);
  frame.context_line = contents[lineno];
  const end = makeRangeEnd(lineno);
  frame.post_context = [];
  for (let i = lineno + 1; i <= end; i++) {
    const line = contents[i];
    if (void 0 === line) break;
    frame.post_context.push(line);
  }
}
__name(addContextToFrame, "addContextToFrame");
function clearLineContext(frame) {
  delete frame.pre_context;
  delete frame.context_line;
  delete frame.post_context;
}
__name(clearLineContext, "clearLineContext");
function shouldSkipContextLinesForFile(path) {
  return path.startsWith("node:") || path.endsWith(".min.js") || path.endsWith(".min.cjs") || path.endsWith(".min.mjs") || path.startsWith("data:");
}
__name(shouldSkipContextLinesForFile, "shouldSkipContextLinesForFile");
function shouldSkipContextLinesForFrame(frame) {
  if (void 0 !== frame.lineno && frame.lineno > MAX_CONTEXTLINES_LINENO) return true;
  if (void 0 !== frame.colno && frame.colno > MAX_CONTEXTLINES_COLNO) return true;
  return false;
}
__name(shouldSkipContextLinesForFrame, "shouldSkipContextLinesForFrame");
function rangeExistsInContentCache(file, range) {
  const contents = LRU_FILE_CONTENTS_CACHE.get(file);
  if (void 0 === contents) return false;
  for (let i = range[0]; i <= range[1]; i++) if (void 0 === contents[i]) return false;
  return true;
}
__name(rangeExistsInContentCache, "rangeExistsInContentCache");
function makeLineReaderRanges(lines) {
  if (!lines.length) return [];
  let i = 0;
  const line = lines[0];
  if ("number" != typeof line) return [];
  let current = makeContextRange(line);
  const out = [];
  while (true) {
    if (i === lines.length - 1) {
      out.push(current);
      break;
    }
    const next = lines[i + 1];
    if ("number" != typeof next) break;
    if (next <= current[1]) current[1] = next + DEFAULT_LINES_OF_CONTEXT;
    else {
      out.push(current);
      current = makeContextRange(next);
    }
    i++;
  }
  return out;
}
__name(makeLineReaderRanges, "makeLineReaderRanges");
function makeContextRange(line) {
  return [
    makeRangeStart(line),
    makeRangeEnd(line)
  ];
}
__name(makeContextRange, "makeContextRange");
function makeRangeStart(line) {
  return Math.max(1, line - DEFAULT_LINES_OF_CONTEXT);
}
__name(makeRangeStart, "makeRangeStart");
function makeRangeEnd(line) {
  return line + DEFAULT_LINES_OF_CONTEXT;
}
__name(makeRangeEnd, "makeRangeEnd");
function emplace(map, key, contents) {
  const value = map.get(key);
  if (void 0 === value) {
    map.set(key, contents);
    return contents;
  }
  return value;
}
__name(emplace, "emplace");
function snipLine(line, colno) {
  let newLine = line;
  const lineLength = newLine.length;
  if (lineLength <= 150) return newLine;
  if (colno > lineLength) colno = lineLength;
  let start = Math.max(colno - 60, 0);
  if (start < 5) start = 0;
  let end = Math.min(start + 140, lineLength);
  if (end > lineLength - 5) end = lineLength;
  if (end === lineLength) start = Math.max(end - 140, 0);
  newLine = newLine.slice(start, end);
  if (start > 0) newLine = `...${newLine}`;
  if (end < lineLength) newLine += "...";
  return newLine;
}
__name(snipLine, "snipLine");

// node_modules/posthog-node/dist/extensions/error-tracking/index.mjs
init_esm();

// node_modules/posthog-node/dist/extensions/error-tracking/autocapture.mjs
init_esm();
function makeUncaughtExceptionHandler(captureFn, onFatalFn) {
  let calledFatalError = false;
  return Object.assign((error) => {
    const userProvidedListenersCount = global.process.listeners("uncaughtException").filter((listener) => "domainUncaughtExceptionClear" !== listener.name && true !== listener._posthogErrorHandler).length;
    const processWouldExit = 0 === userProvidedListenersCount;
    captureFn(error, {
      mechanism: {
        type: "onuncaughtexception",
        handled: false
      }
    });
    if (!calledFatalError && processWouldExit) {
      calledFatalError = true;
      onFatalFn(error);
    }
  }, {
    _posthogErrorHandler: true
  });
}
__name(makeUncaughtExceptionHandler, "makeUncaughtExceptionHandler");
function addUncaughtExceptionListener(captureFn, onFatalFn) {
  globalThis.process?.on("uncaughtException", makeUncaughtExceptionHandler(captureFn, onFatalFn));
}
__name(addUncaughtExceptionListener, "addUncaughtExceptionListener");
function addUnhandledRejectionListener(captureFn) {
  globalThis.process?.on("unhandledRejection", (reason) => captureFn(reason, {
    mechanism: {
      type: "onunhandledrejection",
      handled: false
    }
  }));
}
__name(addUnhandledRejectionListener, "addUnhandledRejectionListener");

// node_modules/posthog-node/dist/extensions/error-tracking/index.mjs
var SHUTDOWN_TIMEOUT = 2e3;
var ErrorTracking = class _ErrorTracking {
  static {
    __name(this, "ErrorTracking");
  }
  constructor(client, options, _logger) {
    this.client = client;
    this._exceptionAutocaptureEnabled = options.enableExceptionAutocapture || false;
    this._logger = _logger;
    this._rateLimiter = new BucketedRateLimiter({
      refillRate: 1,
      bucketSize: 10,
      refillInterval: 1e4,
      _logger: this._logger
    });
    this.startAutocaptureIfEnabled();
  }
  static isPreviouslyCapturedError(x) {
    return isObject(x) && "__posthog_previously_captured_error" in x && true === x.__posthog_previously_captured_error;
  }
  static async buildEventMessage(error, hint, distinctId, additionalProperties) {
    const properties = {
      ...additionalProperties
    };
    if (!distinctId) properties.$process_person_profile = false;
    const exceptionProperties = this.errorPropertiesBuilder.buildFromUnknown(error, hint);
    exceptionProperties.$exception_list = await this.errorPropertiesBuilder.modifyFrames(exceptionProperties.$exception_list);
    return {
      event: "$exception",
      distinctId: distinctId || uuidv7(),
      properties: {
        ...exceptionProperties,
        ...properties
      }
    };
  }
  startAutocaptureIfEnabled() {
    if (this.isEnabled()) {
      addUncaughtExceptionListener(this.onException.bind(this), this.onFatalError.bind(this));
      addUnhandledRejectionListener(this.onException.bind(this));
    }
  }
  onException(exception, hint) {
    this.client.addPendingPromise((async () => {
      if (!_ErrorTracking.isPreviouslyCapturedError(exception)) {
        const eventMessage = await _ErrorTracking.buildEventMessage(exception, hint);
        const exceptionProperties = eventMessage.properties;
        const exceptionType = exceptionProperties?.$exception_list[0]?.type ?? "Exception";
        const isRateLimited = this._rateLimiter.consumeRateLimit(exceptionType);
        if (isRateLimited) return void this._logger.info("Skipping exception capture because of client rate limiting.", {
          exception: exceptionType
        });
        return this.client.capture(eventMessage);
      }
    })());
  }
  async onFatalError(exception) {
    console.error(exception);
    await this.client.shutdown(SHUTDOWN_TIMEOUT);
    process.exit(1);
  }
  isEnabled() {
    return !this.client.isDisabled && this._exceptionAutocaptureEnabled;
  }
  shutdown() {
    this._rateLimiter.stop();
  }
};

// node_modules/posthog-node/dist/client.mjs
init_esm();

// node_modules/posthog-node/dist/version.mjs
init_esm();
var version = "5.21.2";

// node_modules/posthog-node/dist/types.mjs
init_esm();
var FeatureFlagError = {
  ERRORS_WHILE_COMPUTING: "errors_while_computing_flags",
  FLAG_MISSING: "flag_missing",
  QUOTA_LIMITED: "quota_limited",
  UNKNOWN_ERROR: "unknown_error"
};

// node_modules/posthog-node/dist/extensions/feature-flags/feature-flags.mjs
init_esm();

// node_modules/posthog-node/dist/extensions/feature-flags/crypto.mjs
init_esm();
async function hashSHA1(text) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("SubtleCrypto API not available");
  const hashBuffer = await subtle.digest("SHA-1", new TextEncoder().encode(text));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(hashSHA1, "hashSHA1");

// node_modules/posthog-node/dist/extensions/feature-flags/feature-flags.mjs
var SIXTY_SECONDS = 6e4;
var LONG_SCALE = 1152921504606847e3;
var NULL_VALUES_ALLOWED_OPERATORS = [
  "is_not"
];
var ClientError = class _ClientError extends Error {
  static {
    __name(this, "ClientError");
  }
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = "ClientError";
    this.message = message;
    Object.setPrototypeOf(this, _ClientError.prototype);
  }
};
var InconclusiveMatchError = class _InconclusiveMatchError extends Error {
  static {
    __name(this, "InconclusiveMatchError");
  }
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, _InconclusiveMatchError.prototype);
  }
};
var RequiresServerEvaluation = class _RequiresServerEvaluation extends Error {
  static {
    __name(this, "RequiresServerEvaluation");
  }
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, _RequiresServerEvaluation.prototype);
  }
};
var FeatureFlagsPoller = class {
  static {
    __name(this, "FeatureFlagsPoller");
  }
  constructor({ pollingInterval, personalApiKey, projectApiKey, timeout, host, customHeaders, ...options }) {
    this.debugMode = false;
    this.shouldBeginExponentialBackoff = false;
    this.backOffCount = 0;
    this.pollingInterval = pollingInterval;
    this.personalApiKey = personalApiKey;
    this.featureFlags = [];
    this.featureFlagsByKey = {};
    this.groupTypeMapping = {};
    this.cohorts = {};
    this.loadedSuccessfullyOnce = false;
    this.timeout = timeout;
    this.projectApiKey = projectApiKey;
    this.host = host;
    this.poller = void 0;
    this.fetch = options.fetch || fetch;
    this.onError = options.onError;
    this.customHeaders = customHeaders;
    this.onLoad = options.onLoad;
    this.cacheProvider = options.cacheProvider;
    this.strictLocalEvaluation = options.strictLocalEvaluation ?? false;
    this.loadFeatureFlags();
  }
  debug(enabled = true) {
    this.debugMode = enabled;
  }
  logMsgIfDebug(fn) {
    if (this.debugMode) fn();
  }
  async getFeatureFlag(key, distinctId, groups = {}, personProperties = {}, groupProperties = {}) {
    await this.loadFeatureFlags();
    let response;
    let featureFlag;
    if (!this.loadedSuccessfullyOnce) return response;
    featureFlag = this.featureFlagsByKey[key];
    if (void 0 !== featureFlag) try {
      const result = await this.computeFlagAndPayloadLocally(featureFlag, distinctId, groups, personProperties, groupProperties);
      response = result.value;
      this.logMsgIfDebug(() => console.debug(`Successfully computed flag locally: ${key} -> ${response}`));
    } catch (e) {
      if (e instanceof RequiresServerEvaluation || e instanceof InconclusiveMatchError) this.logMsgIfDebug(() => console.debug(`${e.name} when computing flag locally: ${key}: ${e.message}`));
      else if (e instanceof Error) this.onError?.(new Error(`Error computing flag locally: ${key}: ${e}`));
    }
    return response;
  }
  async getAllFlagsAndPayloads(distinctId, groups = {}, personProperties = {}, groupProperties = {}, flagKeysToExplicitlyEvaluate) {
    await this.loadFeatureFlags();
    const response = {};
    const payloads = {};
    let fallbackToFlags = 0 == this.featureFlags.length;
    const flagsToEvaluate = flagKeysToExplicitlyEvaluate ? flagKeysToExplicitlyEvaluate.map((key) => this.featureFlagsByKey[key]).filter(Boolean) : this.featureFlags;
    const sharedEvaluationCache = {};
    await Promise.all(flagsToEvaluate.map(async (flag) => {
      try {
        const { value: matchValue, payload: matchPayload } = await this.computeFlagAndPayloadLocally(flag, distinctId, groups, personProperties, groupProperties, void 0, sharedEvaluationCache);
        response[flag.key] = matchValue;
        if (matchPayload) payloads[flag.key] = matchPayload;
      } catch (e) {
        if (e instanceof RequiresServerEvaluation || e instanceof InconclusiveMatchError) this.logMsgIfDebug(() => console.debug(`${e.name} when computing flag locally: ${flag.key}: ${e.message}`));
        else if (e instanceof Error) this.onError?.(new Error(`Error computing flag locally: ${flag.key}: ${e}`));
        fallbackToFlags = true;
      }
    }));
    return {
      response,
      payloads,
      fallbackToFlags
    };
  }
  async computeFlagAndPayloadLocally(flag, distinctId, groups = {}, personProperties = {}, groupProperties = {}, matchValue, evaluationCache, skipLoadCheck = false) {
    if (!skipLoadCheck) await this.loadFeatureFlags();
    if (!this.loadedSuccessfullyOnce) return {
      value: false,
      payload: null
    };
    let flagValue;
    flagValue = void 0 !== matchValue ? matchValue : await this.computeFlagValueLocally(flag, distinctId, groups, personProperties, groupProperties, evaluationCache);
    const payload = this.getFeatureFlagPayload(flag.key, flagValue);
    return {
      value: flagValue,
      payload
    };
  }
  async computeFlagValueLocally(flag, distinctId, groups = {}, personProperties = {}, groupProperties = {}, evaluationCache = {}) {
    if (flag.ensure_experience_continuity) throw new InconclusiveMatchError("Flag has experience continuity enabled");
    if (!flag.active) return false;
    const flagFilters = flag.filters || {};
    const aggregation_group_type_index = flagFilters.aggregation_group_type_index;
    if (void 0 == aggregation_group_type_index) return await this.matchFeatureFlagProperties(flag, distinctId, personProperties, evaluationCache);
    {
      const groupName = this.groupTypeMapping[String(aggregation_group_type_index)];
      if (!groupName) {
        this.logMsgIfDebug(() => console.warn(`[FEATURE FLAGS] Unknown group type index ${aggregation_group_type_index} for feature flag ${flag.key}`));
        throw new InconclusiveMatchError("Flag has unknown group type index");
      }
      if (!(groupName in groups)) {
        this.logMsgIfDebug(() => console.warn(`[FEATURE FLAGS] Can't compute group feature flag: ${flag.key} without group names passed in`));
        return false;
      }
      const focusedGroupProperties = groupProperties[groupName];
      return await this.matchFeatureFlagProperties(flag, groups[groupName], focusedGroupProperties, evaluationCache);
    }
  }
  getFeatureFlagPayload(key, flagValue) {
    let payload = null;
    if (false !== flagValue && null != flagValue) {
      if ("boolean" == typeof flagValue) payload = this.featureFlagsByKey?.[key]?.filters?.payloads?.[flagValue.toString()] || null;
      else if ("string" == typeof flagValue) payload = this.featureFlagsByKey?.[key]?.filters?.payloads?.[flagValue] || null;
      if (null != payload) {
        if ("object" == typeof payload) return payload;
        if ("string" == typeof payload) try {
          return JSON.parse(payload);
        } catch {
        }
        return payload;
      }
    }
    return null;
  }
  async evaluateFlagDependency(property, distinctId, properties, evaluationCache) {
    const targetFlagKey = property.key;
    if (!this.featureFlagsByKey) throw new InconclusiveMatchError("Feature flags not available for dependency evaluation");
    if (!("dependency_chain" in property)) throw new InconclusiveMatchError(`Flag dependency property for '${targetFlagKey}' is missing required 'dependency_chain' field`);
    const dependencyChain = property.dependency_chain;
    if (!Array.isArray(dependencyChain)) throw new InconclusiveMatchError(`Flag dependency property for '${targetFlagKey}' has an invalid 'dependency_chain' (expected array, got ${typeof dependencyChain})`);
    if (0 === dependencyChain.length) throw new InconclusiveMatchError(`Circular dependency detected for flag '${targetFlagKey}' (empty dependency chain)`);
    for (const depFlagKey of dependencyChain) {
      if (!(depFlagKey in evaluationCache)) {
        const depFlag = this.featureFlagsByKey[depFlagKey];
        if (depFlag) if (depFlag.active) try {
          const depResult = await this.matchFeatureFlagProperties(depFlag, distinctId, properties, evaluationCache);
          evaluationCache[depFlagKey] = depResult;
        } catch (error) {
          throw new InconclusiveMatchError(`Error evaluating flag dependency '${depFlagKey}' for flag '${targetFlagKey}': ${error}`);
        }
        else evaluationCache[depFlagKey] = false;
        else throw new InconclusiveMatchError(`Missing flag dependency '${depFlagKey}' for flag '${targetFlagKey}'`);
      }
      const cachedResult = evaluationCache[depFlagKey];
      if (null == cachedResult) throw new InconclusiveMatchError(`Dependency '${depFlagKey}' could not be evaluated`);
    }
    const targetFlagValue = evaluationCache[targetFlagKey];
    return this.flagEvaluatesToExpectedValue(property.value, targetFlagValue);
  }
  flagEvaluatesToExpectedValue(expectedValue, flagValue) {
    if ("boolean" == typeof expectedValue) return expectedValue === flagValue || "string" == typeof flagValue && "" !== flagValue && true === expectedValue;
    if ("string" == typeof expectedValue) return flagValue === expectedValue;
    return false;
  }
  async matchFeatureFlagProperties(flag, distinctId, properties, evaluationCache = {}) {
    const flagFilters = flag.filters || {};
    const flagConditions = flagFilters.groups || [];
    let isInconclusive = false;
    let result;
    for (const condition of flagConditions) try {
      if (await this.isConditionMatch(flag, distinctId, condition, properties, evaluationCache)) {
        const variantOverride = condition.variant;
        const flagVariants = flagFilters.multivariate?.variants || [];
        result = variantOverride && flagVariants.some((variant) => variant.key === variantOverride) ? variantOverride : await this.getMatchingVariant(flag, distinctId) || true;
        break;
      }
    } catch (e) {
      if (e instanceof RequiresServerEvaluation) throw e;
      if (e instanceof InconclusiveMatchError) isInconclusive = true;
      else throw e;
    }
    if (void 0 !== result) return result;
    if (isInconclusive) throw new InconclusiveMatchError("Can't determine if feature flag is enabled or not with given properties");
    return false;
  }
  async isConditionMatch(flag, distinctId, condition, properties, evaluationCache = {}) {
    const rolloutPercentage = condition.rollout_percentage;
    const warnFunction = /* @__PURE__ */ __name((msg) => {
      this.logMsgIfDebug(() => console.warn(msg));
    }, "warnFunction");
    if ((condition.properties || []).length > 0) {
      for (const prop of condition.properties) {
        const propertyType = prop.type;
        let matches = false;
        matches = "cohort" === propertyType ? matchCohort(prop, properties, this.cohorts, this.debugMode) : "flag" === propertyType ? await this.evaluateFlagDependency(prop, distinctId, properties, evaluationCache) : matchProperty(prop, properties, warnFunction);
        if (!matches) return false;
      }
      if (void 0 == rolloutPercentage) return true;
    }
    if (void 0 != rolloutPercentage && await _hash(flag.key, distinctId) > rolloutPercentage / 100) return false;
    return true;
  }
  async getMatchingVariant(flag, distinctId) {
    const hashValue = await _hash(flag.key, distinctId, "variant");
    const matchingVariant = this.variantLookupTable(flag).find((variant) => hashValue >= variant.valueMin && hashValue < variant.valueMax);
    if (matchingVariant) return matchingVariant.key;
  }
  variantLookupTable(flag) {
    const lookupTable = [];
    let valueMin = 0;
    let valueMax = 0;
    const flagFilters = flag.filters || {};
    const multivariates = flagFilters.multivariate?.variants || [];
    multivariates.forEach((variant) => {
      valueMax = valueMin + variant.rollout_percentage / 100;
      lookupTable.push({
        valueMin,
        valueMax,
        key: variant.key
      });
      valueMin = valueMax;
    });
    return lookupTable;
  }
  updateFlagState(flagData) {
    this.featureFlags = flagData.flags;
    this.featureFlagsByKey = flagData.flags.reduce((acc, curr) => (acc[curr.key] = curr, acc), {});
    this.groupTypeMapping = flagData.groupTypeMapping;
    this.cohorts = flagData.cohorts;
    this.loadedSuccessfullyOnce = true;
  }
  warnAboutExperienceContinuityFlags(flags) {
    if (this.strictLocalEvaluation) return;
    const experienceContinuityFlags = flags.filter((f) => f.ensure_experience_continuity);
    if (experienceContinuityFlags.length > 0) console.warn(`[PostHog] You are using local evaluation but ${experienceContinuityFlags.length} flag(s) have experience continuity enabled: ${experienceContinuityFlags.map((f) => f.key).join(", ")}. Experience continuity is incompatible with local evaluation and will cause a server request on every flag evaluation, negating local evaluation cost savings. To avoid server requests and unexpected costs, either disable experience continuity on these flags in PostHog, use strictLocalEvaluation: true in client init, or pass onlyEvaluateLocally: true per flag call (flags that cannot be evaluated locally will return undefined).`);
  }
  async loadFromCache(debugMessage) {
    if (!this.cacheProvider) return false;
    try {
      const cached = await this.cacheProvider.getFlagDefinitions();
      if (cached) {
        this.updateFlagState(cached);
        this.logMsgIfDebug(() => console.debug(`[FEATURE FLAGS] ${debugMessage} (${cached.flags.length} flags)`));
        this.onLoad?.(this.featureFlags.length);
        this.warnAboutExperienceContinuityFlags(cached.flags);
        return true;
      }
      return false;
    } catch (err) {
      this.onError?.(new Error(`Failed to load from cache: ${err}`));
      return false;
    }
  }
  async loadFeatureFlags(forceReload = false) {
    if (this.loadedSuccessfullyOnce && !forceReload) return;
    if (!forceReload && this.nextFetchAllowedAt && Date.now() < this.nextFetchAllowedAt) return void this.logMsgIfDebug(() => console.debug("[FEATURE FLAGS] Skipping fetch, in backoff period"));
    if (!this.loadingPromise) this.loadingPromise = this._loadFeatureFlags().catch((err) => this.logMsgIfDebug(() => console.debug(`[FEATURE FLAGS] Failed to load feature flags: ${err}`))).finally(() => {
      this.loadingPromise = void 0;
    });
    return this.loadingPromise;
  }
  isLocalEvaluationReady() {
    return (this.loadedSuccessfullyOnce ?? false) && (this.featureFlags?.length ?? 0) > 0;
  }
  getPollingInterval() {
    if (!this.shouldBeginExponentialBackoff) return this.pollingInterval;
    return Math.min(SIXTY_SECONDS, this.pollingInterval * 2 ** this.backOffCount);
  }
  beginBackoff() {
    this.shouldBeginExponentialBackoff = true;
    this.backOffCount += 1;
    this.nextFetchAllowedAt = Date.now() + this.getPollingInterval();
  }
  clearBackoff() {
    this.shouldBeginExponentialBackoff = false;
    this.backOffCount = 0;
    this.nextFetchAllowedAt = void 0;
  }
  async _loadFeatureFlags() {
    if (this.poller) {
      clearTimeout(this.poller);
      this.poller = void 0;
    }
    this.poller = setTimeout(() => this.loadFeatureFlags(true), this.getPollingInterval());
    try {
      let shouldFetch = true;
      if (this.cacheProvider) try {
        shouldFetch = await this.cacheProvider.shouldFetchFlagDefinitions();
      } catch (err) {
        this.onError?.(new Error(`Error in shouldFetchFlagDefinitions: ${err}`));
      }
      if (!shouldFetch) {
        const loaded = await this.loadFromCache("Loaded flags from cache (skipped fetch)");
        if (loaded) return;
        if (this.loadedSuccessfullyOnce) return;
      }
      const res = await this._requestFeatureFlagDefinitions();
      if (!res) return;
      switch (res.status) {
        case 304:
          this.logMsgIfDebug(() => console.debug("[FEATURE FLAGS] Flags not modified (304), using cached data"));
          this.flagsEtag = res.headers?.get("ETag") ?? this.flagsEtag;
          this.loadedSuccessfullyOnce = true;
          this.clearBackoff();
          return;
        case 401:
          this.beginBackoff();
          throw new ClientError(`Your project key or personal API key is invalid. Setting next polling interval to ${this.getPollingInterval()}ms. More information: https://posthog.com/docs/api#rate-limiting`);
        case 402:
          console.warn("[FEATURE FLAGS] Feature flags quota limit exceeded - unsetting all local flags. Learn more about billing limits at https://posthog.com/docs/billing/limits-alerts");
          this.featureFlags = [];
          this.featureFlagsByKey = {};
          this.groupTypeMapping = {};
          this.cohorts = {};
          return;
        case 403:
          this.beginBackoff();
          throw new ClientError(`Your personal API key does not have permission to fetch feature flag definitions for local evaluation. Setting next polling interval to ${this.getPollingInterval()}ms. Are you sure you're using the correct personal and Project API key pair? More information: https://posthog.com/docs/api/overview`);
        case 429:
          this.beginBackoff();
          throw new ClientError(`You are being rate limited. Setting next polling interval to ${this.getPollingInterval()}ms. More information: https://posthog.com/docs/api#rate-limiting`);
        case 200: {
          const responseJson = await res.json() ?? {};
          if (!("flags" in responseJson)) return void this.onError?.(new Error(`Invalid response when getting feature flags: ${JSON.stringify(responseJson)}`));
          this.flagsEtag = res.headers?.get("ETag") ?? void 0;
          const flagData = {
            flags: responseJson.flags ?? [],
            groupTypeMapping: responseJson.group_type_mapping || {},
            cohorts: responseJson.cohorts || {}
          };
          this.updateFlagState(flagData);
          this.clearBackoff();
          if (this.cacheProvider && shouldFetch) try {
            await this.cacheProvider.onFlagDefinitionsReceived(flagData);
          } catch (err) {
            this.onError?.(new Error(`Failed to store in cache: ${err}`));
          }
          this.onLoad?.(this.featureFlags.length);
          this.warnAboutExperienceContinuityFlags(flagData.flags);
          break;
        }
        default:
          return;
      }
    } catch (err) {
      if (err instanceof ClientError) this.onError?.(err);
    }
  }
  getPersonalApiKeyRequestOptions(method = "GET", etag) {
    const headers = {
      ...this.customHeaders,
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.personalApiKey}`
    };
    if (etag) headers["If-None-Match"] = etag;
    return {
      method,
      headers
    };
  }
  _requestFeatureFlagDefinitions() {
    const url = `${this.host}/api/feature_flag/local_evaluation?token=${this.projectApiKey}&send_cohorts`;
    const options = this.getPersonalApiKeyRequestOptions("GET", this.flagsEtag);
    let abortTimeout = null;
    if (this.timeout && "number" == typeof this.timeout) {
      const controller = new AbortController();
      abortTimeout = safeSetTimeout(() => {
        controller.abort();
      }, this.timeout);
      options.signal = controller.signal;
    }
    try {
      const fetch1 = this.fetch;
      return fetch1(url, options);
    } finally {
      clearTimeout(abortTimeout);
    }
  }
  async stopPoller(timeoutMs = 3e4) {
    clearTimeout(this.poller);
    if (this.cacheProvider) try {
      const shutdownResult = this.cacheProvider.shutdown();
      if (shutdownResult instanceof Promise) await Promise.race([
        shutdownResult,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Cache shutdown timeout after ${timeoutMs}ms`)), timeoutMs))
      ]);
    } catch (err) {
      this.onError?.(new Error(`Error during cache shutdown: ${err}`));
    }
  }
};
async function _hash(key, distinctId, salt = "") {
  const hashString = await hashSHA1(`${key}.${distinctId}${salt}`);
  return parseInt(hashString.slice(0, 15), 16) / LONG_SCALE;
}
__name(_hash, "_hash");
function matchProperty(property, propertyValues, warnFunction) {
  const key = property.key;
  const value = property.value;
  const operator = property.operator || "exact";
  if (key in propertyValues) {
    if ("is_not_set" === operator) throw new InconclusiveMatchError("Operator is_not_set is not supported");
  } else throw new InconclusiveMatchError(`Property ${key} not found in propertyValues`);
  const overrideValue = propertyValues[key];
  if (null == overrideValue && !NULL_VALUES_ALLOWED_OPERATORS.includes(operator)) {
    if (warnFunction) warnFunction(`Property ${key} cannot have a value of null/undefined with the ${operator} operator`);
    return false;
  }
  function computeExactMatch(value2, overrideValue2) {
    if (Array.isArray(value2)) return value2.map((val) => String(val).toLowerCase()).includes(String(overrideValue2).toLowerCase());
    return String(value2).toLowerCase() === String(overrideValue2).toLowerCase();
  }
  __name(computeExactMatch, "computeExactMatch");
  function compare(lhs, rhs, operator2) {
    if ("gt" === operator2) return lhs > rhs;
    if ("gte" === operator2) return lhs >= rhs;
    if ("lt" === operator2) return lhs < rhs;
    if ("lte" === operator2) return lhs <= rhs;
    throw new Error(`Invalid operator: ${operator2}`);
  }
  __name(compare, "compare");
  switch (operator) {
    case "exact":
      return computeExactMatch(value, overrideValue);
    case "is_not":
      return !computeExactMatch(value, overrideValue);
    case "is_set":
      return key in propertyValues;
    case "icontains":
      return String(overrideValue).toLowerCase().includes(String(value).toLowerCase());
    case "not_icontains":
      return !String(overrideValue).toLowerCase().includes(String(value).toLowerCase());
    case "regex":
      return isValidRegex(String(value)) && null !== String(overrideValue).match(String(value));
    case "not_regex":
      return isValidRegex(String(value)) && null === String(overrideValue).match(String(value));
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      let parsedValue = "number" == typeof value ? value : null;
      if ("string" == typeof value) try {
        parsedValue = parseFloat(value);
      } catch (err) {
      }
      if (null == parsedValue || null == overrideValue) return compare(String(overrideValue), String(value), operator);
      if ("string" == typeof overrideValue) return compare(overrideValue, String(value), operator);
      return compare(overrideValue, parsedValue, operator);
    }
    case "is_date_after":
    case "is_date_before": {
      if ("boolean" == typeof value) throw new InconclusiveMatchError("Date operations cannot be performed on boolean values");
      let parsedDate = relativeDateParseForFeatureFlagMatching(String(value));
      if (null == parsedDate) parsedDate = convertToDateTime(value);
      if (null == parsedDate) throw new InconclusiveMatchError(`Invalid date: ${value}`);
      const overrideDate = convertToDateTime(overrideValue);
      if ([
        "is_date_before"
      ].includes(operator)) return overrideDate < parsedDate;
      return overrideDate > parsedDate;
    }
    default:
      throw new InconclusiveMatchError(`Unknown operator: ${operator}`);
  }
}
__name(matchProperty, "matchProperty");
function checkCohortExists(cohortId, cohortProperties) {
  if (!(cohortId in cohortProperties)) throw new RequiresServerEvaluation(`cohort ${cohortId} not found in local cohorts - likely a static cohort that requires server evaluation`);
}
__name(checkCohortExists, "checkCohortExists");
function matchCohort(property, propertyValues, cohortProperties, debugMode = false) {
  const cohortId = String(property.value);
  checkCohortExists(cohortId, cohortProperties);
  const propertyGroup = cohortProperties[cohortId];
  return matchPropertyGroup(propertyGroup, propertyValues, cohortProperties, debugMode);
}
__name(matchCohort, "matchCohort");
function matchPropertyGroup(propertyGroup, propertyValues, cohortProperties, debugMode = false) {
  if (!propertyGroup) return true;
  const propertyGroupType = propertyGroup.type;
  const properties = propertyGroup.values;
  if (!properties || 0 === properties.length) return true;
  let errorMatchingLocally = false;
  if ("values" in properties[0]) {
    for (const prop of properties) try {
      const matches = matchPropertyGroup(prop, propertyValues, cohortProperties, debugMode);
      if ("AND" === propertyGroupType) {
        if (!matches) return false;
      } else if (matches) return true;
    } catch (err) {
      if (err instanceof RequiresServerEvaluation) throw err;
      if (err instanceof InconclusiveMatchError) {
        if (debugMode) console.debug(`Failed to compute property ${prop} locally: ${err}`);
        errorMatchingLocally = true;
      } else throw err;
    }
    if (errorMatchingLocally) throw new InconclusiveMatchError("Can't match cohort without a given cohort property value");
    return "AND" === propertyGroupType;
  }
  for (const prop of properties) try {
    let matches;
    if ("cohort" === prop.type) matches = matchCohort(prop, propertyValues, cohortProperties, debugMode);
    else if ("flag" === prop.type) {
      if (debugMode) console.warn(`[FEATURE FLAGS] Flag dependency filters are not supported in local evaluation. Skipping condition with dependency on flag '${prop.key || "unknown"}'`);
      continue;
    } else matches = matchProperty(prop, propertyValues);
    const negation = prop.negation || false;
    if ("AND" === propertyGroupType) {
      if (!matches && !negation) return false;
      if (matches && negation) return false;
    } else {
      if (matches && !negation) return true;
      if (!matches && negation) return true;
    }
  } catch (err) {
    if (err instanceof RequiresServerEvaluation) throw err;
    if (err instanceof InconclusiveMatchError) {
      if (debugMode) console.debug(`Failed to compute property ${prop} locally: ${err}`);
      errorMatchingLocally = true;
    } else throw err;
  }
  if (errorMatchingLocally) throw new InconclusiveMatchError("can't match cohort without a given cohort property value");
  return "AND" === propertyGroupType;
}
__name(matchPropertyGroup, "matchPropertyGroup");
function isValidRegex(regex) {
  try {
    new RegExp(regex);
    return true;
  } catch (err) {
    return false;
  }
}
__name(isValidRegex, "isValidRegex");
function convertToDateTime(value) {
  if (value instanceof Date) return value;
  if ("string" == typeof value || "number" == typeof value) {
    const date = new Date(value);
    if (!isNaN(date.valueOf())) return date;
    throw new InconclusiveMatchError(`${value} is in an invalid date format`);
  }
  throw new InconclusiveMatchError(`The date provided ${value} must be a string, number, or date object`);
}
__name(convertToDateTime, "convertToDateTime");
function relativeDateParseForFeatureFlagMatching(value) {
  const regex = /^-?(?<number>[0-9]+)(?<interval>[a-z])$/;
  const match = value.match(regex);
  const parsedDt = new Date((/* @__PURE__ */ new Date()).toISOString());
  if (!match) return null;
  {
    if (!match.groups) return null;
    const number = parseInt(match.groups["number"]);
    if (number >= 1e4) return null;
    const interval = match.groups["interval"];
    if ("h" == interval) parsedDt.setUTCHours(parsedDt.getUTCHours() - number);
    else if ("d" == interval) parsedDt.setUTCDate(parsedDt.getUTCDate() - number);
    else if ("w" == interval) parsedDt.setUTCDate(parsedDt.getUTCDate() - 7 * number);
    else if ("m" == interval) parsedDt.setUTCMonth(parsedDt.getUTCMonth() - number);
    else {
      if ("y" != interval) return null;
      parsedDt.setUTCFullYear(parsedDt.getUTCFullYear() - number);
    }
    return parsedDt;
  }
}
__name(relativeDateParseForFeatureFlagMatching, "relativeDateParseForFeatureFlagMatching");

// node_modules/posthog-node/dist/storage-memory.mjs
init_esm();
var PostHogMemoryStorage = class {
  static {
    __name(this, "PostHogMemoryStorage");
  }
  getProperty(key) {
    return this._memoryStorage[key];
  }
  setProperty(key, value) {
    this._memoryStorage[key] = null !== value ? value : void 0;
  }
  constructor() {
    this._memoryStorage = {};
  }
};

// node_modules/posthog-node/dist/client.mjs
var MINIMUM_POLLING_INTERVAL = 100;
var THIRTY_SECONDS = 3e4;
var MAX_CACHE_SIZE = 5e4;
var PostHogBackendClient = class extends PostHogCoreStateless {
  static {
    __name(this, "PostHogBackendClient");
  }
  constructor(apiKey, options = {}) {
    super(apiKey, options), this._memoryStorage = new PostHogMemoryStorage();
    this.options = options;
    this.context = this.initializeContext();
    this.options.featureFlagsPollingInterval = "number" == typeof options.featureFlagsPollingInterval ? Math.max(options.featureFlagsPollingInterval, MINIMUM_POLLING_INTERVAL) : THIRTY_SECONDS;
    if (options.personalApiKey) {
      if (options.personalApiKey.includes("phc_")) throw new Error('Your Personal API key is invalid. These keys are prefixed with "phx_" and can be created in PostHog project settings.');
      const shouldEnableLocalEvaluation = false !== options.enableLocalEvaluation;
      if (shouldEnableLocalEvaluation) this.featureFlagsPoller = new FeatureFlagsPoller({
        pollingInterval: this.options.featureFlagsPollingInterval,
        personalApiKey: options.personalApiKey,
        projectApiKey: apiKey,
        timeout: options.requestTimeout ?? 1e4,
        host: this.host,
        fetch: options.fetch,
        onError: /* @__PURE__ */ __name((err) => {
          this._events.emit("error", err);
        }, "onError"),
        onLoad: /* @__PURE__ */ __name((count) => {
          this._events.emit("localEvaluationFlagsLoaded", count);
        }, "onLoad"),
        customHeaders: this.getCustomHeaders(),
        cacheProvider: options.flagDefinitionCacheProvider,
        strictLocalEvaluation: options.strictLocalEvaluation
      });
    }
    this.errorTracking = new ErrorTracking(this, options, this._logger);
    this.distinctIdHasSentFlagCalls = {};
    this.maxCacheSize = options.maxCacheSize || MAX_CACHE_SIZE;
  }
  getPersistedProperty(key) {
    return this._memoryStorage.getProperty(key);
  }
  setPersistedProperty(key, value) {
    return this._memoryStorage.setProperty(key, value);
  }
  fetch(url, options) {
    return this.options.fetch ? this.options.fetch(url, options) : fetch(url, options);
  }
  getLibraryVersion() {
    return version;
  }
  getCustomUserAgent() {
    return `${this.getLibraryId()}/${this.getLibraryVersion()}`;
  }
  enable() {
    return super.optIn();
  }
  disable() {
    return super.optOut();
  }
  debug(enabled = true) {
    super.debug(enabled);
    this.featureFlagsPoller?.debug(enabled);
  }
  capture(props) {
    if ("string" == typeof props) this._logger.warn("Called capture() with a string as the first argument when an object was expected.");
    this.addPendingPromise(this.prepareEventMessage(props).then(({ distinctId, event, properties, options }) => super.captureStateless(distinctId, event, properties, {
      timestamp: options.timestamp,
      disableGeoip: options.disableGeoip,
      uuid: options.uuid
    })).catch((err) => {
      if (err) console.error(err);
    }));
  }
  async captureImmediate(props) {
    if ("string" == typeof props) this._logger.warn("Called captureImmediate() with a string as the first argument when an object was expected.");
    return this.addPendingPromise(this.prepareEventMessage(props).then(({ distinctId, event, properties, options }) => super.captureStatelessImmediate(distinctId, event, properties, {
      timestamp: options.timestamp,
      disableGeoip: options.disableGeoip,
      uuid: options.uuid
    })).catch((err) => {
      if (err) console.error(err);
    }));
  }
  identify({ distinctId, properties = {}, disableGeoip }) {
    const { $set, $set_once, $anon_distinct_id, ...rest } = properties;
    const setProps = $set || rest;
    const setOnceProps = $set_once || {};
    const eventProperties = {
      $set: setProps,
      $set_once: setOnceProps,
      $anon_distinct_id: $anon_distinct_id ?? void 0
    };
    super.identifyStateless(distinctId, eventProperties, {
      disableGeoip
    });
  }
  async identifyImmediate({ distinctId, properties = {}, disableGeoip }) {
    const { $set, $set_once, $anon_distinct_id, ...rest } = properties;
    const setProps = $set || rest;
    const setOnceProps = $set_once || {};
    const eventProperties = {
      $set: setProps,
      $set_once: setOnceProps,
      $anon_distinct_id: $anon_distinct_id ?? void 0
    };
    super.identifyStatelessImmediate(distinctId, eventProperties, {
      disableGeoip
    });
  }
  alias(data) {
    super.aliasStateless(data.alias, data.distinctId, void 0, {
      disableGeoip: data.disableGeoip
    });
  }
  async aliasImmediate(data) {
    await super.aliasStatelessImmediate(data.alias, data.distinctId, void 0, {
      disableGeoip: data.disableGeoip
    });
  }
  isLocalEvaluationReady() {
    return this.featureFlagsPoller?.isLocalEvaluationReady() ?? false;
  }
  async waitForLocalEvaluationReady(timeoutMs = THIRTY_SECONDS) {
    if (this.isLocalEvaluationReady()) return true;
    if (void 0 === this.featureFlagsPoller) return false;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);
      const cleanup = this._events.on("localEvaluationFlagsLoaded", (count) => {
        clearTimeout(timeout);
        cleanup();
        resolve(count > 0);
      });
    });
  }
  async _getFeatureFlagResult(key, distinctId, options = {}, matchValue) {
    const sendFeatureFlagEvents = options.sendFeatureFlagEvents ?? true;
    if (void 0 !== this._flagOverrides && key in this._flagOverrides) {
      const overrideValue = this._flagOverrides[key];
      if (void 0 === overrideValue) return;
      const overridePayload = this._payloadOverrides?.[key];
      return {
        key,
        enabled: false !== overrideValue,
        variant: "string" == typeof overrideValue ? overrideValue : void 0,
        payload: overridePayload
      };
    }
    const { groups, disableGeoip } = options;
    let { onlyEvaluateLocally, personProperties, groupProperties } = options;
    const adjustedProperties = this.addLocalPersonAndGroupProperties(distinctId, groups, personProperties, groupProperties);
    personProperties = adjustedProperties.allPersonProperties;
    groupProperties = adjustedProperties.allGroupProperties;
    if (void 0 == onlyEvaluateLocally) onlyEvaluateLocally = this.options.strictLocalEvaluation ?? false;
    let result;
    let flagWasLocallyEvaluated = false;
    let requestId;
    let evaluatedAt;
    let featureFlagError;
    let flagId;
    let flagVersion;
    let flagReason;
    const localEvaluationEnabled = void 0 !== this.featureFlagsPoller;
    if (localEvaluationEnabled) {
      await this.featureFlagsPoller?.loadFeatureFlags();
      const flag = this.featureFlagsPoller?.featureFlagsByKey[key];
      if (flag) try {
        const localResult = await this.featureFlagsPoller?.computeFlagAndPayloadLocally(flag, distinctId, groups, personProperties, groupProperties, matchValue);
        if (localResult) {
          flagWasLocallyEvaluated = true;
          const value = localResult.value;
          flagId = flag.id;
          flagReason = "Evaluated locally";
          result = {
            key,
            enabled: false !== value,
            variant: "string" == typeof value ? value : void 0,
            payload: localResult.payload ?? void 0
          };
        }
      } catch (e) {
        if (e instanceof RequiresServerEvaluation || e instanceof InconclusiveMatchError) this._logger?.info(`${e.name} when computing flag locally: ${key}: ${e.message}`);
        else throw e;
      }
    }
    if (!flagWasLocallyEvaluated && !onlyEvaluateLocally) {
      const flagsResponse = await super.getFeatureFlagDetailsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, [
        key
      ]);
      if (void 0 === flagsResponse) featureFlagError = FeatureFlagError.UNKNOWN_ERROR;
      else {
        requestId = flagsResponse.requestId;
        evaluatedAt = flagsResponse.evaluatedAt;
        const errors = [];
        if (flagsResponse.errorsWhileComputingFlags) errors.push(FeatureFlagError.ERRORS_WHILE_COMPUTING);
        if (flagsResponse.quotaLimited?.includes("feature_flags")) errors.push(FeatureFlagError.QUOTA_LIMITED);
        const flagDetail = flagsResponse.flags[key];
        if (void 0 === flagDetail) errors.push(FeatureFlagError.FLAG_MISSING);
        else {
          flagId = flagDetail.metadata?.id;
          flagVersion = flagDetail.metadata?.version;
          flagReason = flagDetail.reason?.description ?? flagDetail.reason?.code;
          let parsedPayload;
          if (flagDetail.metadata?.payload !== void 0) try {
            parsedPayload = JSON.parse(flagDetail.metadata.payload);
          } catch {
            parsedPayload = flagDetail.metadata.payload;
          }
          result = {
            key,
            enabled: flagDetail.enabled,
            variant: flagDetail.variant,
            payload: parsedPayload
          };
        }
        if (errors.length > 0) featureFlagError = errors.join(",");
      }
    }
    if (sendFeatureFlagEvents) {
      const response = void 0 === result ? void 0 : false === result.enabled ? false : result.variant ?? true;
      const featureFlagReportedKey = `${key}_${response}`;
      if (!(distinctId in this.distinctIdHasSentFlagCalls) || !this.distinctIdHasSentFlagCalls[distinctId].includes(featureFlagReportedKey)) {
        if (Object.keys(this.distinctIdHasSentFlagCalls).length >= this.maxCacheSize) this.distinctIdHasSentFlagCalls = {};
        if (Array.isArray(this.distinctIdHasSentFlagCalls[distinctId])) this.distinctIdHasSentFlagCalls[distinctId].push(featureFlagReportedKey);
        else this.distinctIdHasSentFlagCalls[distinctId] = [
          featureFlagReportedKey
        ];
        const properties = {
          $feature_flag: key,
          $feature_flag_response: response,
          $feature_flag_id: flagId,
          $feature_flag_version: flagVersion,
          $feature_flag_reason: flagReason,
          locally_evaluated: flagWasLocallyEvaluated,
          [`$feature/${key}`]: response,
          $feature_flag_request_id: requestId,
          $feature_flag_evaluated_at: evaluatedAt
        };
        if (featureFlagError) properties.$feature_flag_error = featureFlagError;
        this.capture({
          distinctId,
          event: "$feature_flag_called",
          properties,
          groups,
          disableGeoip
        });
      }
    }
    if (void 0 !== result && void 0 !== this._payloadOverrides && key in this._payloadOverrides) result = {
      ...result,
      payload: this._payloadOverrides[key]
    };
    return result;
  }
  async getFeatureFlag(key, distinctId, options) {
    const result = await this._getFeatureFlagResult(key, distinctId, {
      ...options,
      sendFeatureFlagEvents: options?.sendFeatureFlagEvents ?? this.options.sendFeatureFlagEvent ?? true
    });
    if (void 0 === result) return;
    if (false === result.enabled) return false;
    return result.variant ?? true;
  }
  async getFeatureFlagPayload(key, distinctId, matchValue, options) {
    if (void 0 !== this._payloadOverrides && key in this._payloadOverrides) return this._payloadOverrides[key];
    const result = await this._getFeatureFlagResult(key, distinctId, {
      ...options,
      sendFeatureFlagEvents: false
    }, matchValue);
    if (void 0 === result) return;
    return result.payload ?? null;
  }
  async getFeatureFlagResult(key, distinctId, options) {
    return this._getFeatureFlagResult(key, distinctId, {
      ...options,
      sendFeatureFlagEvents: options?.sendFeatureFlagEvents ?? this.options.sendFeatureFlagEvent ?? true
    });
  }
  async getRemoteConfigPayload(flagKey) {
    if (!this.options.personalApiKey) throw new Error("Personal API key is required for remote config payload decryption");
    const response = await this._requestRemoteConfigPayload(flagKey);
    if (!response) return;
    const parsed = await response.json();
    if ("string" == typeof parsed) try {
      return JSON.parse(parsed);
    } catch (e) {
    }
    return parsed;
  }
  async isFeatureEnabled(key, distinctId, options) {
    const feat = await this.getFeatureFlag(key, distinctId, options);
    if (void 0 === feat) return;
    return !!feat || false;
  }
  async getAllFlags(distinctId, options) {
    const response = await this.getAllFlagsAndPayloads(distinctId, options);
    return response.featureFlags || {};
  }
  async getAllFlagsAndPayloads(distinctId, options) {
    const { groups, disableGeoip, flagKeys } = options || {};
    let { onlyEvaluateLocally, personProperties, groupProperties } = options || {};
    const adjustedProperties = this.addLocalPersonAndGroupProperties(distinctId, groups, personProperties, groupProperties);
    personProperties = adjustedProperties.allPersonProperties;
    groupProperties = adjustedProperties.allGroupProperties;
    if (void 0 == onlyEvaluateLocally) onlyEvaluateLocally = this.options.strictLocalEvaluation ?? false;
    const localEvaluationResult = await this.featureFlagsPoller?.getAllFlagsAndPayloads(distinctId, groups, personProperties, groupProperties, flagKeys);
    let featureFlags = {};
    let featureFlagPayloads = {};
    let fallbackToFlags = true;
    if (localEvaluationResult) {
      featureFlags = localEvaluationResult.response;
      featureFlagPayloads = localEvaluationResult.payloads;
      fallbackToFlags = localEvaluationResult.fallbackToFlags;
    }
    if (fallbackToFlags && !onlyEvaluateLocally) {
      const remoteEvaluationResult = await super.getFeatureFlagsAndPayloadsStateless(distinctId, groups, personProperties, groupProperties, disableGeoip, flagKeys);
      featureFlags = {
        ...featureFlags,
        ...remoteEvaluationResult.flags || {}
      };
      featureFlagPayloads = {
        ...featureFlagPayloads,
        ...remoteEvaluationResult.payloads || {}
      };
    }
    if (void 0 !== this._flagOverrides) featureFlags = {
      ...featureFlags,
      ...this._flagOverrides
    };
    if (void 0 !== this._payloadOverrides) featureFlagPayloads = {
      ...featureFlagPayloads,
      ...this._payloadOverrides
    };
    return {
      featureFlags,
      featureFlagPayloads
    };
  }
  groupIdentify({ groupType, groupKey, properties, distinctId, disableGeoip }) {
    super.groupIdentifyStateless(groupType, groupKey, properties, {
      disableGeoip
    }, distinctId);
  }
  async reloadFeatureFlags() {
    await this.featureFlagsPoller?.loadFeatureFlags(true);
  }
  overrideFeatureFlags(overrides) {
    const flagArrayToRecord = /* @__PURE__ */ __name((flags) => Object.fromEntries(flags.map((f) => [
      f,
      true
    ])), "flagArrayToRecord");
    if (false === overrides) {
      this._flagOverrides = void 0;
      this._payloadOverrides = void 0;
      return;
    }
    if (Array.isArray(overrides)) {
      this._flagOverrides = flagArrayToRecord(overrides);
      return;
    }
    if (this._isFeatureFlagOverrideOptions(overrides)) {
      if ("flags" in overrides) {
        if (false === overrides.flags) this._flagOverrides = void 0;
        else if (Array.isArray(overrides.flags)) this._flagOverrides = flagArrayToRecord(overrides.flags);
        else if (void 0 !== overrides.flags) this._flagOverrides = {
          ...overrides.flags
        };
      }
      if ("payloads" in overrides) {
        if (false === overrides.payloads) this._payloadOverrides = void 0;
        else if (void 0 !== overrides.payloads) this._payloadOverrides = {
          ...overrides.payloads
        };
      }
      return;
    }
    this._flagOverrides = {
      ...overrides
    };
  }
  _isFeatureFlagOverrideOptions(overrides) {
    if ("object" != typeof overrides || null === overrides || Array.isArray(overrides)) return false;
    const obj = overrides;
    if ("flags" in obj) {
      const flagsValue = obj["flags"];
      if (false === flagsValue || Array.isArray(flagsValue) || "object" == typeof flagsValue && null !== flagsValue) return true;
    }
    if ("payloads" in obj) {
      const payloadsValue = obj["payloads"];
      if (false === payloadsValue || "object" == typeof payloadsValue && null !== payloadsValue) return true;
    }
    return false;
  }
  withContext(data, fn, options) {
    if (!this.context) return fn();
    return this.context.run(data, fn, options);
  }
  getContext() {
    return this.context?.get();
  }
  async _shutdown(shutdownTimeoutMs) {
    this.featureFlagsPoller?.stopPoller(shutdownTimeoutMs);
    this.errorTracking.shutdown();
    return super._shutdown(shutdownTimeoutMs);
  }
  async _requestRemoteConfigPayload(flagKey) {
    if (!this.options.personalApiKey) return;
    const url = `${this.host}/api/projects/@current/feature_flags/${flagKey}/remote_config?token=${encodeURIComponent(this.apiKey)}`;
    const options = {
      method: "GET",
      headers: {
        ...this.getCustomHeaders(),
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.personalApiKey}`
      }
    };
    let abortTimeout = null;
    if (this.options.requestTimeout && "number" == typeof this.options.requestTimeout) {
      const controller = new AbortController();
      abortTimeout = safeSetTimeout(() => {
        controller.abort();
      }, this.options.requestTimeout);
      options.signal = controller.signal;
    }
    try {
      return await this.fetch(url, options);
    } catch (error) {
      this._events.emit("error", error);
      return;
    } finally {
      if (abortTimeout) clearTimeout(abortTimeout);
    }
  }
  extractPropertiesFromEvent(eventProperties, groups) {
    if (!eventProperties) return {
      personProperties: {},
      groupProperties: {}
    };
    const personProperties = {};
    const groupProperties = {};
    for (const [key, value] of Object.entries(eventProperties)) if (isPlainObject(value) && groups && key in groups) {
      const groupProps = {};
      for (const [groupKey, groupValue] of Object.entries(value)) groupProps[String(groupKey)] = String(groupValue);
      groupProperties[String(key)] = groupProps;
    } else personProperties[String(key)] = String(value);
    return {
      personProperties,
      groupProperties
    };
  }
  async getFeatureFlagsForEvent(distinctId, groups, disableGeoip, sendFeatureFlagsOptions) {
    const finalPersonProperties = sendFeatureFlagsOptions?.personProperties || {};
    const finalGroupProperties = sendFeatureFlagsOptions?.groupProperties || {};
    const flagKeys = sendFeatureFlagsOptions?.flagKeys;
    const onlyEvaluateLocally = sendFeatureFlagsOptions?.onlyEvaluateLocally ?? this.options.strictLocalEvaluation ?? false;
    if (onlyEvaluateLocally) if (!((this.featureFlagsPoller?.featureFlags?.length || 0) > 0)) return {};
    else {
      const groupsWithStringValues = {};
      for (const [key, value] of Object.entries(groups || {})) groupsWithStringValues[key] = String(value);
      return await this.getAllFlags(distinctId, {
        groups: groupsWithStringValues,
        personProperties: finalPersonProperties,
        groupProperties: finalGroupProperties,
        disableGeoip,
        onlyEvaluateLocally: true,
        flagKeys
      });
    }
    if ((this.featureFlagsPoller?.featureFlags?.length || 0) > 0) {
      const groupsWithStringValues = {};
      for (const [key, value] of Object.entries(groups || {})) groupsWithStringValues[key] = String(value);
      return await this.getAllFlags(distinctId, {
        groups: groupsWithStringValues,
        personProperties: finalPersonProperties,
        groupProperties: finalGroupProperties,
        disableGeoip,
        onlyEvaluateLocally: true,
        flagKeys
      });
    }
    return (await super.getFeatureFlagsStateless(distinctId, groups, finalPersonProperties, finalGroupProperties, disableGeoip)).flags;
  }
  addLocalPersonAndGroupProperties(distinctId, groups, personProperties, groupProperties) {
    const allPersonProperties = {
      distinct_id: distinctId,
      ...personProperties || {}
    };
    const allGroupProperties = {};
    if (groups) for (const groupName of Object.keys(groups)) allGroupProperties[groupName] = {
      $group_key: groups[groupName],
      ...groupProperties?.[groupName] || {}
    };
    return {
      allPersonProperties,
      allGroupProperties
    };
  }
  captureException(error, distinctId, additionalProperties, uuid) {
    if (!ErrorTracking.isPreviouslyCapturedError(error)) {
      const syntheticException = new Error("PostHog syntheticException");
      this.addPendingPromise(ErrorTracking.buildEventMessage(error, {
        syntheticException
      }, distinctId, additionalProperties).then((msg) => this.capture({
        ...msg,
        uuid
      })));
    }
  }
  async captureExceptionImmediate(error, distinctId, additionalProperties) {
    if (!ErrorTracking.isPreviouslyCapturedError(error)) {
      const syntheticException = new Error("PostHog syntheticException");
      this.addPendingPromise(ErrorTracking.buildEventMessage(error, {
        syntheticException
      }, distinctId, additionalProperties).then((msg) => this.captureImmediate(msg)));
    }
  }
  async prepareEventMessage(props) {
    const { distinctId, event, properties, groups, sendFeatureFlags, timestamp, disableGeoip, uuid } = props;
    const contextData = this.context?.get();
    let mergedDistinctId = distinctId || contextData?.distinctId;
    const mergedProperties = {
      ...contextData?.properties || {},
      ...properties || {}
    };
    if (!mergedDistinctId) {
      mergedDistinctId = uuidv7();
      mergedProperties.$process_person_profile = false;
    }
    if (contextData?.sessionId && !mergedProperties.$session_id) mergedProperties.$session_id = contextData.sessionId;
    const eventMessage = this._runBeforeSend({
      distinctId: mergedDistinctId,
      event,
      properties: mergedProperties,
      groups,
      sendFeatureFlags,
      timestamp,
      disableGeoip,
      uuid
    });
    if (!eventMessage) return Promise.reject(null);
    const eventProperties = await Promise.resolve().then(async () => {
      if (sendFeatureFlags) {
        const sendFeatureFlagsOptions = "object" == typeof sendFeatureFlags ? sendFeatureFlags : void 0;
        return await this.getFeatureFlagsForEvent(eventMessage.distinctId, groups, disableGeoip, sendFeatureFlagsOptions);
      }
      eventMessage.event;
      return {};
    }).then((flags) => {
      const additionalProperties = {};
      if (flags) for (const [feature, variant] of Object.entries(flags)) additionalProperties[`$feature/${feature}`] = variant;
      const activeFlags = Object.keys(flags || {}).filter((flag) => flags?.[flag] !== false).sort();
      if (activeFlags.length > 0) additionalProperties["$active_feature_flags"] = activeFlags;
      return additionalProperties;
    }).catch(() => ({})).then((additionalProperties) => {
      const props2 = {
        ...additionalProperties,
        ...eventMessage.properties || {},
        $groups: eventMessage.groups || groups
      };
      return props2;
    });
    if ("$pageview" === eventMessage.event && this.options.__preview_capture_bot_pageviews && "string" == typeof eventProperties.$raw_user_agent) {
      if (isBlockedUA(eventProperties.$raw_user_agent, this.options.custom_blocked_useragents || [])) {
        eventMessage.event = "$bot_pageview";
        eventProperties.$browser_type = "bot";
      }
    }
    return {
      distinctId: eventMessage.distinctId,
      event: eventMessage.event,
      properties: eventProperties,
      options: {
        timestamp: eventMessage.timestamp,
        disableGeoip: eventMessage.disableGeoip,
        uuid: eventMessage.uuid
      }
    };
  }
  _runBeforeSend(eventMessage) {
    const beforeSend = this.options.before_send;
    if (!beforeSend) return eventMessage;
    const fns = Array.isArray(beforeSend) ? beforeSend : [
      beforeSend
    ];
    let result = eventMessage;
    for (const fn of fns) {
      result = fn(result);
      if (!result) {
        this._logger.info(`Event '${eventMessage.event}' was rejected in beforeSend function`);
        return null;
      }
      if (!result.properties || 0 === Object.keys(result.properties).length) {
        const message = `Event '${result.event}' has no properties after beforeSend function, this is likely an error.`;
        this._logger.warn(message);
      }
    }
    return result;
  }
};

// node_modules/posthog-node/dist/extensions/context/context.mjs
init_esm();
import { AsyncLocalStorage } from "node:async_hooks";
var PostHogContext = class {
  static {
    __name(this, "PostHogContext");
  }
  constructor() {
    this.storage = new AsyncLocalStorage();
  }
  get() {
    return this.storage.getStore();
  }
  run(context, fn, options) {
    const fresh = options?.fresh === true;
    if (fresh) return this.storage.run(context, fn);
    {
      const currentContext = this.get() || {};
      const mergedContext = {
        distinctId: context.distinctId ?? currentContext.distinctId,
        sessionId: context.sessionId ?? currentContext.sessionId,
        properties: {
          ...currentContext.properties || {},
          ...context.properties || {}
        }
      };
      return this.storage.run(mergedContext, fn);
    }
  }
};

// node_modules/posthog-node/dist/exports.mjs
init_esm();

// node_modules/posthog-node/dist/extensions/sentry-integration.mjs
init_esm();
var NAME = "posthog-node";
function createEventProcessor(_posthog, { organization, projectId, prefix, severityAllowList = [
  "error"
], sendExceptionsToPostHog = true } = {}) {
  return (event) => {
    const shouldProcessLevel = "*" === severityAllowList || severityAllowList.includes(event.level);
    if (!shouldProcessLevel) return event;
    if (!event.tags) event.tags = {};
    const userId = event.tags[PostHogSentryIntegration.POSTHOG_ID_TAG];
    if (void 0 === userId) return event;
    const uiHost = _posthog.options.host ?? "https://us.i.posthog.com";
    const personUrl = new URL(`/project/${_posthog.apiKey}/person/${userId}`, uiHost).toString();
    event.tags["PostHog Person URL"] = personUrl;
    const exceptions = event.exception?.values || [];
    const exceptionList = exceptions.map((exception) => ({
      ...exception,
      stacktrace: exception.stacktrace ? {
        ...exception.stacktrace,
        type: "raw",
        frames: (exception.stacktrace.frames || []).map((frame) => ({
          ...frame,
          platform: "node:javascript"
        }))
      } : void 0
    }));
    const properties = {
      $exception_message: exceptions[0]?.value || event.message,
      $exception_type: exceptions[0]?.type,
      $exception_level: event.level,
      $exception_list: exceptionList,
      $sentry_event_id: event.event_id,
      $sentry_exception: event.exception,
      $sentry_exception_message: exceptions[0]?.value || event.message,
      $sentry_exception_type: exceptions[0]?.type,
      $sentry_tags: event.tags
    };
    if (organization && projectId) properties["$sentry_url"] = (prefix || "https://sentry.io/organizations/") + organization + "/issues/?project=" + projectId + "&query=" + event.event_id;
    if (sendExceptionsToPostHog) _posthog.capture({
      event: "$exception",
      distinctId: userId,
      properties
    });
    return event;
  };
}
__name(createEventProcessor, "createEventProcessor");
var PostHogSentryIntegration = class {
  static {
    __name(this, "PostHogSentryIntegration");
  }
  static #_ = this.POSTHOG_ID_TAG = "posthog_distinct_id";
  constructor(_posthog, organization, prefix, severityAllowList, sendExceptionsToPostHog) {
    this.name = NAME;
    this.name = NAME;
    this.setupOnce = function(addGlobalEventProcessor, getCurrentHub) {
      const projectId = getCurrentHub()?.getClient()?.getDsn()?.projectId;
      addGlobalEventProcessor(createEventProcessor(_posthog, {
        organization,
        projectId,
        prefix,
        severityAllowList,
        sendExceptionsToPostHog: sendExceptionsToPostHog ?? true
      }));
    };
  }
};

// node_modules/posthog-node/dist/extensions/express.mjs
init_esm();

// node_modules/posthog-node/dist/entrypoints/index.node.mjs
ErrorTracking.errorPropertiesBuilder = new error_tracking_exports.ErrorPropertiesBuilder([
  new error_tracking_exports.EventCoercer(),
  new error_tracking_exports.ErrorCoercer(),
  new error_tracking_exports.ObjectCoercer(),
  new error_tracking_exports.StringCoercer(),
  new error_tracking_exports.PrimitiveCoercer()
], error_tracking_exports.createStackParser("node:javascript", error_tracking_exports.nodeStackLineParser), [
  createModulerModifier(),
  addSourceContext
]);
var PostHog = class extends PostHogBackendClient {
  static {
    __name(this, "PostHog");
  }
  getLibraryId() {
    return "posthog-node";
  }
  initializeContext() {
    return new PostHogContext();
  }
};

// lib/posthog/server.ts
var _client = null;
function getPostHogServer() {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (_client) return _client;
  _client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    // Flush quickly — actions are short-lived and we'd rather pay per-request
    // than risk dropped events on an unexpected process kill.
    flushAt: 1,
    flushInterval: 0
  });
  return _client;
}
__name(getPostHogServer, "getPostHogServer");
async function captureServerEvent(args) {
  const client = getPostHogServer();
  if (!client) return;
  try {
    client.capture({
      distinctId: args.distinctId,
      event: args.event,
      properties: args.properties,
      groups: args.groups
    });
    await client.shutdown();
    _client = null;
  } catch (err) {
    console.error(err, { tags: { module: "posthog", event: args.event } });
  }
}
__name(captureServerEvent, "captureServerEvent");

// lib/posthog/events.ts
async function trackServerEvent(event, args) {
  const { distinctId, ...rest } = args;
  await captureServerEvent({
    distinctId,
    event,
    properties: rest
  });
}
__name(trackServerEvent, "trackServerEvent");

// lib/services/marketing/process-campaign-send.ts
async function processCampaignSend(campaignId) {
  const [campaign] = await dbAdmin.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId)).limit(1);
  if (!campaign) {
    return { delivered: 0, total: 0 };
  }
  const [professional] = await dbAdmin.select().from(professionals).where(eq(professionals.id, campaign.professionalId)).limit(1);
  if (!professional) {
    await finalizeCampaignSend(campaignId, campaign.sentCount ?? 0);
    return { delivered: 0, total: 0 };
  }
  const queued = await dbAdmin.select().from(emailCampaignRecipients).where(
    and(
      eq(emailCampaignRecipients.campaignId, campaignId),
      eq(emailCampaignRecipients.status, "queued")
    )
  );
  const resend = getResend();
  if (!resend) {
    for (const row of queued) {
      await markRecipientSent({
        id: row.id,
        error: "Email delivery isn't configured (missing RESEND_API_KEY)."
      });
    }
    const sentCount = await countSentRecipients(campaignId);
    await finalizeCampaignSend(campaignId, sentCount);
    return { delivered: 0, total: queued.length };
  }
  const from = fromAddress();
  const ctxBase = {
    professional_name: professional.fullName,
    portal_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal`,
    booking_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal/calendar`,
    site_url: env.NEXT_PUBLIC_APP_URL
  };
  let delivered = 0;
  for (const row of queued) {
    const subject = expandMergeTags(campaign.subject, {
      ...ctxBase,
      client_name: row.fullName
    });
    const html = expandMergeTags(campaign.bodyHtml, {
      ...ctxBase,
      client_name: row.fullName
    });
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: [row.email],
        subject,
        html,
        headers: {
          "X-Entity-Ref-ID": `campaign:${campaign.id}:${row.id}`
        },
        tags: [
          { name: "campaign_id", value: campaign.id },
          { name: "professional_id", value: professional.id }
        ]
      });
      if (error || !data) {
        await markRecipientSent({
          id: row.id,
          error: error?.message ?? "Unknown delivery error"
        });
        continue;
      }
      await markRecipientSent({
        id: row.id,
        resendMessageId: data.id
      });
      delivered += 1;
      if (delivered % 25 === 0) {
        await dbAdmin.update(emailCampaigns).set({ sentCount: sql`${emailCampaigns.sentCount} + 25` }).where(eq(emailCampaigns.id, campaign.id));
      }
    } catch (err) {
      console.error(err, { tags: { action: "marketing.processCampaignSend" } });
      await markRecipientSent({
        id: row.id,
        error: err instanceof Error ? err.message : "Unknown error"
      });
    }
  }
  const finalSent = await countSentRecipients(campaignId);
  await finalizeCampaignSend(campaignId, finalSent);
  void trackServerEvent("email_campaign_sent", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    plan: professional.plan,
    campaignId,
    delivered,
    total: queued.length
  });
  return { delivered, total: queued.length };
}
__name(processCampaignSend, "processCampaignSend");
async function countSentRecipients(campaignId) {
  const rows = await dbAdmin.select({ count: sql`count(*)::int` }).from(emailCampaignRecipients).where(
    and(
      eq(emailCampaignRecipients.campaignId, campaignId),
      eq(emailCampaignRecipients.status, "sent")
    )
  );
  return rows[0]?.count ?? 0;
}
__name(countSentRecipients, "countSentRecipients");

// trigger/jobs/campaigns.ts
var sendCampaignTask = task({
  id: "marketing.send-campaign",
  retry: { maxAttempts: 3 },
  maxDuration: 900,
  run: /* @__PURE__ */ __name(async (payload) => {
    return processCampaignSend(payload.campaignId);
  }, "run")
});
export {
  sendCampaignTask
};
/*! Bundled license information:

@posthog/core/dist/vendor/uuidv7.mjs:
  (*! For license information please see uuidv7.mjs.LICENSE.txt *)
  (**
   * uuidv7: An experimental implementation of the proposed UUID Version 7
   *
   * @license Apache-2.0
   * @copyright 2021-2023 LiosK
   * @packageDocumentation
   *)
*/
//# sourceMappingURL=campaigns.mjs.map
