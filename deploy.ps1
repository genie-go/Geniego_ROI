node inject_journey_ko.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location frontend
npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..
python package_deploy.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python deploy_paramiko.py
exit $LASTEXITCODE
