function processProposal(formObj){
  var test, html;
  
  html = HtmlService.createTemplateFromFile('new_proposal_confirmation');
  html.data = formObj;
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}
