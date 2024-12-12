(async () => {
  const { AnalysisServer } = await import('@almighty/lang_server');
  return new AnalysisServer();
})();
