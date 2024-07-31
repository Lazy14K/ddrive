import ELinkIssue from "./ELinkIssue";
import ILinkData from "./ILinkData";
interface IParsedLink {
    error: ELinkIssue;
    data?: ILinkData;
}
export default IParsedLink;
