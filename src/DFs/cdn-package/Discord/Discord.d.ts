import IConfig from "../Types/IConfig";
declare class Discord {
    private config;
    constructor(config: IConfig);
    fetchLatestLink(oldLink: string): Promise<string>;
    private getHTTPConfig;
}
export default Discord;
