"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ELinkIssue_1 = __importDefault(require("../Types/ELinkIssue"));
function ParseLink(input) {
    if (input.includes("?"))
        input = input.split("?")[0];
    if (input.includes("attachments/"))
        input = input.split("attachments/")[1];
    let slashParts = input.split("/");
    if (slashParts.length != 3)
        return { error: ELinkIssue_1.default.INVALID_SLASH_AMOUNT };
    const [channelID, fileID, fileName] = slashParts;
    if (isNaN(Number(channelID)))
        return { error: ELinkIssue_1.default.CHANNEL_ID_NAN };
    if (isNaN(Number(fileID)))
        return { error: ELinkIssue_1.default.FILE_ID_NAN };
    return {
        error: ELinkIssue_1.default.NONE,
        data: {
            channelID: BigInt(channelID),
            fileID: BigInt(fileID),
            fileName,
        },
    };
}
exports.default = ParseLink;
//# sourceMappingURL=ParseLink.js.map