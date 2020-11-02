//Hyperlink related functions

export function stringToHyperlink(rawData: any): any {
  try {
    //checks if the rawData provided is a valid url
    const url = new URL(rawData);
    //turns url into a hyperlink
    const hyperlink = rawData.link(url);
    return hyperlink;
  } catch (e) {
    return rawData;
  }
}

export function checkHyperlink(rawData: any): any {
  try {
    //checks if the rawData provided is a valid url
    new URL(rawData);
    return true;
  } catch (e) {
    return false;
  }
}
