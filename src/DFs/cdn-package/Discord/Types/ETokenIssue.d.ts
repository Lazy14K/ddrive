declare enum ETokenIssue {
    NONE = "",
    INVALID_AMOUNT_OF_DOTS = "The Token has an invalid amount of dots.",
    NON_BASE64_UTF8 = "The ID part of the token is not valid",
    ID_NOT_A_NUMBER = "THe ID part of the token is not a number",
    ID_TOO_SHORT = "The ID part of the token is too short"
}
export default ETokenIssue;
