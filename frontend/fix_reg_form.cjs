const fs = require('fs');
const file = 'd:/project/GeniegoROI/frontend/src/pages/AuthPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `<RegisterForm
              plan="free"
              onSwitch={handleSwitch}
              isDemoMode={IS_DEMO}
            />`;
            
const replace1 = `<FreeRegisterForm
              onSwitch={handleSwitch}
              onBack={() => setMode("register")}
            />`;

const target2 = `<RegisterForm
              plan={selectedPaid}
              plans={PAID_PLANS}
              selectedPaid={selectedPaid}
              onSelectPaid={setSelectedPaid}
              onSwitch={handleSwitch}
              isDemoMode={false}
            />`;
            
const replace2 = `<PaidRegisterForm
              selectedPlan={selectedPaid}
              onSwitch={handleSwitch}
              onBack={() => setMode("register")}
            />`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed RegisterForm bug!');
