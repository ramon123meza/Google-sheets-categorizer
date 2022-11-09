function categorizeItems() {
  const configGSS = SpreadsheetApp.openByUrl(PRINTLIST_SHIPSTATION_CONFIG_GSS_URL);
  const configMappingSheet = configGSS.getSheetByName(PRINTLIST_SHIPSTATION_CONFIG_MAPPING_SHEET_NAME);
  const configRefLastRowSheet = configGSS.getSheetByName(PRINTLIST_SHIPSTATION_CONFIG_REF_LAST_ROW_SHEET_NAME);
  const processedOrderNumbersSheet = configGSS.getSheetByName(PROCESSED_ORDER_NUMBERS_SHEET_NAME);

  let lastProcessedRow = configRefLastRowSheet.getRange("B1").getValue();
  if(lastProcessedRow) {
    lastProcessedRow = Number(lastProcessedRow);
  } else {
    lastProcessedRow = 1;
  }

  const thisGSS = SpreadsheetApp.getActiveSpreadsheet();
  const masterListSheet = thisGSS.getSheetByName(MASTER_LIST_SHEET_NAME);

  if(masterListSheet.getDataRange().getLastRow() <= lastProcessedRow) {
    console.log("No New Rows to Process.");
    return -99;
  }
  const templateSheet = thisGSS.getSheetByName(TEMPLATE_SHEET_NAME);


  // LAID OUT IMPLEMENTATION - DB GSS READ | BEGIN
  let laidOutSKUs = [];
  const laidOutDBGSS = SpreadsheetApp.openByUrl(LAID_OUT_DATABASE_GSS_URL);
  const laidOutDBSheet = laidOutDBGSS.getSheetByName(LAID_OUT_DATABASE_SHEET_NAME);

  const laidOutSKUData = laidOutDBSheet.getRange(1, 1, laidOutDBSheet.getDataRange().getLastRow(), 1).getValues();
  const noLaidOutSKURows = laidOutSKUData.length;
  for(let r = 0 ; r < noLaidOutSKURows; r++) {
    if(laidOutSKUData[r][0]) {
      laidOutSKUs.push(laidOutSKUData[r][0].toString().toUpperCase());
    }
  }
  console.log("NO. of LAID OUT SKUs: " +laidOutSKUs.length);
  // LAID OUT IMPLEMENTATION - DB GSS READ | END


  //// Extract the CONFIG MAPPING : BEGIN
  console.log("Extract the CONFIG MAPPING : BEGIN");
  let configMappingCategories = [];
  let configMappingCategoryValues = [];
  let mappingConfigData = configMappingSheet.getRange(2, 1, configMappingSheet.getDataRange().getLastRow()-1,2).getValues();
  let noMappingRows = mappingConfigData.length;
  for(let i = 0 ; i < noMappingRows; i++) {
    if(mappingConfigData[i][0] && mappingConfigData[i][1]) {
      let cmcPos = configMappingCategories.indexOf(mappingConfigData[i][1].toString());
      if(cmcPos >= 0) {
        configMappingCategoryValues[cmcPos].push(mappingConfigData[i][0].toString());
      } else {
        configMappingCategories.push(mappingConfigData[i][1].toString());
        configMappingCategoryValues.push([mappingConfigData[i][0].toString()]);
      }
    }
  }
  let noMappedCategories = configMappingCategories.length;
  for(let j = 0 ; j < noMappedCategories ; j++) {
    console.log(j + " - " + configMappingCategories[j]);
    console.log(j + " - " + configMappingCategoryValues[j]);
  }
  console.log("Extract the CONFIG MAPPING : END");
  //// Extract the CONFIG MAPPING : END

  //// LOAD ALREADY PROCESSED ORDER NUMBERS : BEGIN
  let alreadyProcessedOrderNumbers = [];
  if(processedOrderNumbersSheet.getDataRange().getLastRow() > 0) {
    const alreadyProcessedOrderNumbersData = processedOrderNumbersSheet.getRange(1, 1
      , processedOrderNumbersSheet.getDataRange().getLastRow(), 1).getValues();
    const noProcessedOrderNumbersRows = alreadyProcessedOrderNumbersData.length;

    for(let i = 0 ; i < noProcessedOrderNumbersRows ; i++) {
      if(alreadyProcessedOrderNumbersData[i][0]) {
        alreadyProcessedOrderNumbers.push(alreadyProcessedOrderNumbersData[i][0].toString());
      }
    }

  }
  console.log("No. of Already Processed Orders: " + alreadyProcessedOrderNumbers.length);  
  //// LOAD ALREADY PROCESSED ORDER NUMBERS : END

  let newMasterListRowsData = masterListSheet.getRange(lastProcessedRow+1, 1
    , masterListSheet.getDataRange().getLastRow()-lastProcessedRow, 14).getValues();
  let noNewMasterListRows = newMasterListRowsData.length;
  let categorySheetNames = [];
  let categorySheets = [];
  let categorySheetsLastDataRow = [];

  let lastCategorisedRow = -1;

  for(let i = 0 ; i < noNewMasterListRows; i++) {
    if(!newMasterListRowsData[i][0]) {
      continue;
    }
    lastCategorisedRow = i;
    let itemSKUVal = newMasterListRowsData[i][0].toString();



    if(newMasterListRowsData[i][6]) {

      let currentRowId = newMasterListRowsData[i][0].toString()
        + "-" + (newMasterListRowsData[i][1] ? newMasterListRowsData[i][1].toString() : "0")
        + "-" + (newMasterListRowsData[i][8] ? newMasterListRowsData[i][8].toString() : "|")
        + "-" + newMasterListRowsData[i][6].toString();

      let orderNumberAlreadyProcessed = alreadyProcessedOrderNumbers.indexOf(currentRowId);
      if(orderNumberAlreadyProcessed >= 0) {
        masterListSheet.getRange(1+lastCategorisedRow+lastProcessedRow, 10).setValue("This Row Seems a Duplicate");
        continue;
      }
      alreadyProcessedOrderNumbers.push(currentRowId);
      processedOrderNumbersSheet.appendRow([currentRowId]);
    }
    
    


    //let categoriesForItem = [];
    let categoryFound = '';
    let categoriesFound = [];
    for(let j = 0 ; j < noMappedCategories ; j++) {
      for(let p = configMappingCategoryValues[j].length-1; p >= 0; p--) {
        if(itemSKUVal.indexOf(configMappingCategoryValues[j][p]) === 0) {
          //categoriesForItem.push(configMappingCategoryValues[j][p] + " | " + configMappingCategories[j]);
          categoryFound = configMappingCategories[j];
          //break;
          let categoryAlreadyPresent = categoriesFound.indexOf(configMappingCategories[j]);
          if(categoryAlreadyPresent < 0) {
            categoriesFound.push(configMappingCategories[j]);
          }
        }
      }
      //if(categoryFound) {
      //  break;
      //}
    }
    //if(categoriesForItem.length == 1) {
    //  continue;
    //}
    //console.log(i + " ==> " + itemSKUVal + " ==> " + categoriesForItem.toString());

    if(categoriesFound.length > 1) {
      console.log("For item: [" +itemSKUVal+ "] Multiple categories ["+categoriesFound.toString()+"] Found");

    }
    //continue;
    if(!categoryFound || categoriesFound.length == 0) {
      categoryFound = "Unassigned";
      categoriesFound.push("Unassigned");
    }
    let noCategories = categoriesFound.length;
    if(categoryFound) {

      for(let cF = 0 ; cF < noCategories; cF++) {
        categoryFound = categoriesFound[cF];
        let sheetPos = categorySheetNames.indexOf(categoryFound);

        let newRow = ['', '', newMasterListRowsData[i][0], newMasterListRowsData[i][1], newMasterListRowsData[i][2]
          , newMasterListRowsData[i][3], newMasterListRowsData[i][4], newMasterListRowsData[i][5]
          , newMasterListRowsData[i][6], newMasterListRowsData[i][7], newMasterListRowsData[i][8]];

        let isLaidOutSKU = laidOutSKUs.indexOf(itemSKUVal.toUpperCase());
        if(isLaidOutSKU >= 0) {
          newRow[0] = "Laid out";
        }

        if(sheetPos >= 0) {
          //categorySheets[sheetPos].appendRow(newMasterListRowsData[i]);
          categorySheets[sheetPos].appendRow(newRow);
          categorySheetsLastDataRow[sheetPos]++;

          if(isLaidOutSKU >= 0) {
            categorySheets[sheetPos].getRange(categorySheetsLastDataRow[sheetPos], 1).setBackground('#66ff00');
          }
        } else {
          categorySheetNames.push(categoryFound);
          categorySheets.push(categoryFound);
          categorySheetsLastDataRow.push(categoriesFound);

          categorySheets[categorySheets.length-1] = thisGSS.getSheetByName(categoryFound);

          if(!categorySheets[categorySheets.length-1]) {
            categorySheets[categorySheets.length-1] = templateSheet.copyTo(thisGSS);
            categorySheets[categorySheets.length-1].setName(categoryFound);
            categorySheets[categorySheets.length-1].showSheet();
          }
          //categorySheets[categorySheets.length-1].appendRow(newMasterListRowsData[i]);

          categorySheetsLastDataRow[categorySheets.length-1] = categorySheets[categorySheets.length-1].getDataRange().getLastRow();
          categorySheets[categorySheets.length-1].appendRow(newRow);
          categorySheetsLastDataRow[categorySheets.length-1]++;

          if(isLaidOutSKU >= 0) {
            categorySheets[categorySheets.length-1].getRange(categorySheetsLastDataRow[categorySheets.length-1], 1).setBackground('#66ff00');
          }
        }

      }

      masterListSheet.getRange(1+lastCategorisedRow+lastProcessedRow, 10).setValue("This row is categorized to [" 
        +categoriesFound.toString()+"]");
    }

    //break;
    if((i+1)%40 == 0) {
      break;
    }
  }

  if(lastCategorisedRow >= 0) {
    configRefLastRowSheet.getRange("B1").setValue(1+lastCategorisedRow+lastProcessedRow);
  }

  SpreadsheetApp.flush();

  return (1+lastCategorisedRow+lastProcessedRow);
}