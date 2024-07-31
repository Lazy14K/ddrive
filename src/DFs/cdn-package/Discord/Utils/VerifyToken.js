"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ETokenIssue_1 = __importDefault(require("../Types/ETokenIssue"));
const GetUTF8Base64_1 = __importDefault(require("./GetUTF8Base64"));
function staticVerifyToken(token) {
    let tokenSplitByDots = token.split(".");
    if (tokenSplitByDots.length != 3)
        return ETokenIssue_1.default.INVALID_AMOUNT_OF_DOTS;
    const decodedID = (0, GetUTF8Base64_1.default)(tokenSplitByDots[0]);
    if (!decodedID)
        return ETokenIssue_1.default.NON_BASE64_UTF8;
    if (isNaN(Number(decodedID)))
        return ETokenIssue_1.default.ID_NOT_A_NUMBER;
    if (decodedID.length < 17)
        return ETokenIssue_1.default.ID_TOO_SHORT;
    return ETokenIssue_1.default.NONE;
}
function VerifyToken(token, performStatic = true) {
    return __awaiter(this, void 0, void 0, function* () {
        let isValidToken = true;
        if (performStatic) {
            const tokenIssue = staticVerifyToken(token);
            isValidToken = tokenIssue == ETokenIssue_1.default.NONE;
            if (!isValidToken) {
                console.log(`[ERROR] VerifyToken(): ${tokenIssue}`);
            }
        }
        else {
            throw new Error("Non Static check is not yet implemented.");
        }
        return isValidToken;
    });
}
exports.default = VerifyToken;
//# sourceMappingURL=VerifyToken.js.map