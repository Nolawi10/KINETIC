& "C:\Program Files\nodejs\node.exe" "E:\Kinetic Models\count.js" | Out-File "E:\Kinetic Models\run_count.out" -Encoding ASCII
Get-Content "E:\Kinetic Models\run_count.out" | Select-Object -Last 1
