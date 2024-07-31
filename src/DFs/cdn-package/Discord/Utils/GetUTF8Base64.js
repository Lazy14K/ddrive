"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function hasNonUTF8Characters(str) {
    return /[^\x00-\x7F]/.test(str);
}
function GetUTF8Base64(input) {
    try {
        const buf = Buffer.from(input, "base64");
        const decodedBase64 = buf.toString();
        if (hasNonUTF8Characters(decodedBase64))
            throw new Error("Contains Non UTF-8 character(s).");
        return decodedBase64;
    }
    catch (ex) {
        return null;
    }
}
exports.default = GetUTF8Base64;
//# sourceMappingURL=GetUTF8Base64.js.map