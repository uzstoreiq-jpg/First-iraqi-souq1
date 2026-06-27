const fs = require('fs');
const text = fs.readFileSync('src/pages/ProductDetail.tsx', 'utf8');

const parts = text.split(/            \{\/\* Simple Description Block \*\/\}/);
if (parts.length === 2) {
    const beforeDesc = parts[0];
    const afterDescStart = parts[1];
    
    const parts2 = afterDescStart.split(/            \{\/\* IN-PAGE CHECKOUT FORM \*\/\}/);
    if(parts2.length === 2) {
        const descBlock = parts2[0];
        const afterFormStart = parts2[1];
        
        const formBlockEndIndex = afterFormStart.indexOf('            {/* Suggested Products */}');
        const formBlock = afterFormStart.substring(0, formBlockEndIndex);
        const afterForm = afterFormStart.substring(formBlockEndIndex);
        
        const newText = beforeDesc + 
            "            {/* IN-PAGE CHECKOUT FORM */}" + formBlock + 
            "            {/* Simple Description Block */}" + descBlock + 
            afterForm;
            
        fs.writeFileSync('src/pages/ProductDetail.tsx', newText);
        console.log("Success");
    } else {
        console.log("Could not find IN-PAGE CHECKOUT FORM");
    }
} else {
    console.log("Could not find Simple Description Block");
}
