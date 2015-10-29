var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');



function processPrincipalProposalResponse(formObj){
	var test, queryArray, queue, responseQuery, html;

	queryArray = [];
	

	switch(formObj.principalResponse){
		case 'Yes':
			createProgramAnnouncement(formObj.programId);
			queue = "";
			break;
		default:
			break;
	}

	responseQuery = 'UPDATE Program_Data pd SET pd.principal_proposal_response = "' + formObj.principalResponse + '", pd.queue = "' + queue + '", pd.proposal_response_date = "' + new Date() + '" WHERE pd.program_id = "' + formObj.programId + '"';
	queryArray.push(responseQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);

	html = HtmlService.createTemplateFromFile('principal_proposal_response_confirmation');
	html.program = getProgramInfo(formObj.programId);
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function createProgramAnnouncement(programId){
	var test;

	prg = getProgramInfo(programId);
}