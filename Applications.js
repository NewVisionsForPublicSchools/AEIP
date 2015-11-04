var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');
var USER = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser'));



function getCurrentApplications(){
	var test;

	// Create html template
	html = HtmlService.createTemplateFromFile('applications_page');

	// Attach program data to html template
	html.data = getOpenApplications();

	// Return html template for applications page
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function loadApplicationForm(programId){
	// Create template
	html = HtmlService.createTemplateFromFile('application_modal');

	// Add program info to template
	html.data = getProgramInfo(programId);

	// Return template
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function getOpenApplications(){
	var test, query, approvedPrograms, openApplications;

	// Query database for approved programs
	query = 'SELECT * FROM Programs p INNER JOIN Program_Data d ON p.program_id = d.program_id WHERE d.status = "Approved"';
	approvedPrograms = NVGAS.getSqlRecords(dbString, query);

	// Filter query results for programs by school and with open application periods
	openApplications = approvedPrograms.filter(function(e){
		return e.school == USER.school;
	});

	// Return open applications
	return openApplications;
}