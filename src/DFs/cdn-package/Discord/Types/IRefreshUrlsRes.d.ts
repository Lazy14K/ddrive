interface IRefreshUrlsRes {
    refreshed_urls: Array<{
        original: string;
        refreshed: string;
    }>;
}
export default IRefreshUrlsRes;
