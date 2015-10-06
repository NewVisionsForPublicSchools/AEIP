var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');



function processProposalSubmission(formObj){
  var test, programId, user, school, query, newId, html;
  
  programId = 'AEIP' + PropertiesService.getScriptProperties().getProperty('nextProgramId');
  user = PropertiesService.getUserProperties().getProperty('currentUser');
  school = getCurrentSchool(user);
  query = 'INSERT INTO Programs (program_id, program_name, school, submitted_by, date_submitted, post_date, '
        + 'application_deadline, number_of_positions, program_type, program_time, trimester, start_date, end_date, '
        + 'program_schedule, hours_per_trimester, eligibility_requirements, additional_requirements, selection_criteria, '
        + 'goals_outcomes, general_duties) VALUES("' + programId + '", "' + formObj.progName + '", "' + school + '", "'
        + user + '", "' + new Date() + '", "' + formObj.postDate + '", "' + formObj.appDeadline + '", "' + formObj.posNum + '", "'
        + formObj.progType + '", "' + formObj.progTime + '", "' + formObj.progTri + '", "' + formObj.progStart + '", "'
        + formObj.progEnd + '", "' + formObj.progSched + '", "' + formObj.estHrs + '", "' + formObj.eligibility + '", "'
        + formObj.addReqs + '", "' + formObj.criteria + '", "' + formObj.goals + '", "' + formObj.duties + '")';
  
  NVGAS.insertSqlRecord(dbString, [query]);
  
  newId = Number(PropertiesService.getScriptProperties().getProperty('nextProgramId')) + 1;
  PropertiesService.getScriptProperties().setProperty('nextProgramId', newId);
  
  html = HtmlService.createTemplateFromFile('new_proposal_confirmation');
  html.data = formObj;
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}
