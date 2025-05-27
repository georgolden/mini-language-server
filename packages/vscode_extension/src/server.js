/** 
 * Here is how to connect an mcp or language server which is es module
*/
(async () => {
  const { AnalysisServer } = await import('@almighty/lang_server');
  return new AnalysisServer();
})();
