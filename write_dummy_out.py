with open(r'E:\Kinetic Models\Frontend\src\components\sensor-sim\dummy-panel.tsx', encoding='utf-8') as f:
    data = f.read()
lines = data.splitlines()
with open(r'E:\Kinetic Models\dummy_out.txt', 'w', encoding='utf-8') as f:
    f.write(str(len(lines)) + '\n')
    for i,l in enumerate(lines[29:170], 30):
        f.write(str(i) + ':' + l + '\n')
