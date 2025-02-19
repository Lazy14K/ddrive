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
const ELinkIssue_1 = __importDefault(require("./Types/ELinkIssue"));
const ParseLink_1 = __importDefault(require("./Utils/ParseLink"));
const axios_1 = __importDefault(require("axios"));
class Discord {
    constructor(config) {
        this.config = config;
    }
    ;
    fetchLatestLink(oldLink) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!oldLink.includes("https://"))
                oldLink = `https://cdn.discordapp.com/${oldLink}`;
            const linkData = (0, ParseLink_1.default)(oldLink);
            if (linkData.error != ELinkIssue_1.default.NONE) {
                throw new Error(linkData.error);
            }
            try {
                const { data } = yield axios_1.default.post("https://discord.com/api/v9/attachments/refresh-urls", {
                    attachment_urls: [oldLink]
                }, this.getHTTPConfig());
                let response = data;
                if (!response || !response.refreshed_urls || response.refreshed_urls.length == 0) {
                    console.log("response:", data);
                    throw new Error("Unexpected Discord response.");
                }
                let updatedLink = response.refreshed_urls[0].refreshed;
                return updatedLink;
            }
            catch (ex) {
                console.log(ex);
            }
            return "";
        });
    }
    getHTTPConfig() {
        return {
            headers: {
                "Authorization": this.config.TOKEN
            }
        };
    }
}
exports.default = Discord;
//# sourceMappingURL=Discord.js.map