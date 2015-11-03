var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');
var userColumns = 'username,roles';
var staffListId = PropertiesService.getScriptProperties().getProperty('STAFFLISTID')
var USER = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser'));


function getCurrentUser(){
  var test, user;
  
  user = Session.getActiveUser().getEmail();
  
  if(user){
    setCurrentUser(user);
    return true;
  }
  else{
    return false;
  }
}



function validateUser(){
  var test, CURRENTUSER, query, validUser;

  CURRENTUSER = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser')).username;
  query = 'SELECT * FROM Users WHERE username = "' + CURRENTUSER + '"';
  
  validUser = NVGAS.getSqlRecords(dbString, query)[0] ? NVGAS.getSqlRecords(dbString, query)[0].username : "";

  return validUser ? true : false;
}



function setCurrentUser(email){
  var query, user;
  
  query = 'SELECT * FROM Users WHERE username = "' + email + '"';
  user = NVGAS.getSqlRecords(dbString, query)[0] ? JSON.stringify(NVGAS.getSqlRecords(dbString, query)[0]) : JSON.stringify(getStaffListInfo(email));
  PropertiesService.getUserProperties().setProperty('currentUser', user);
}



//function getUserRole(user){
//  var test, currentUser, query, userRole;
//  
//  currentUser = user || PropertiesService.getUserProperties().getProperty('currentUser');
//  query = 'SELECT roles FROM Users WHERE username = "' + currentUser + '"'
//  userRole = NVGAS.getSqlRecords(dbString, query)[0];
//  return userRole;
//}



//function getCurrentSchool(user){
//  var test, currentUser, query, userSchool;
//  
//  currentUser = user || PropertiesService.getUserProperties().getProperty('currentUser');
//  query = 'SELECT school FROM Users WHERE username = "' + currentUser + '"'
//  userSchool = NVGAS.getSqlRecords(dbString, query)[0].school;
//  return userSchool;
//}



function getStaffListInfo(username){
  var test, staffListSs, staffListSheet, staffList, userRecord, userSchool, query, class, name, userRole;
  
  staffListSs = SpreadsheetApp.openById(staffListId);
  staffListSheet = staffListSs.getSheetByName('Sheet1');
  staffList = NVSL.getRowsData(staffListSheet);
  userRecord = staffList.filter(function(e){
    return e.workContactWorkEmail == username;
  })[0];
  
  if(userRecord){
    switch(userRecord.payrollCompanyName){
      case "NVCHS For Adv Math&Science":
        userSchool = 'AMS';
        break;
      case "NVCHS For Adv Math&Science II":
        userSchool = 'AMS 2';
        break;
      case "NVCHS For Adv Math&Science III":
        userSchool = 'AMS 3';
        break;
      case "NVCHS For Adv Math&Science IV":
        userSchool = 'AMS 4';
        break;
      case "NVCHS For The Humanities":
        userSchool = 'HUM';
        break;
      case "NVCHS For The Humanities II":
        userSchool = 'HUM 2';
        break;
      case "NVCHS For The Humanities III":
        userSchool = 'HUM 3';
        break;
      default:
        break;
    };
    
    switch(userRecord.jobLevel){
      case "Director of School Operations":
        userRole = 'DSO';
        break;
      case "Principal":
        userRole = 'P';
        break;
      default:
        userRole = null;
    };
    
    class = userRecord.jobClass;
    name = userRecord.employeeName;
    query = 'INSERT INTO Users (username, school, job_class, employee_name, roles) VALUES("' + username + '","'
            + userSchool + '","' + class + '","' + name + '","' + userRole + '")';
    NVGAS.insertSqlRecord(dbString, [query])
    sQuery = 'SELECT * FROM Users WHERE username = "' + username + '"';
    return NVGAS.getSqlRecords(dbString, [sQuery])[0];
  }
  return false;
}



function getUserRole(){
  return USER.roles;
}