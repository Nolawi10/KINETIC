p=r'E:\Kinetic Models\Frontend\src\components\sensor-sim\event-stream.tsx'
with open(p,encoding='utf-8') as f:
    c=f.read()
# remove duplicate exports
# keep only first export function
first = c.find('export function EventStream')
if first >= 0:
    second = c.find('export function EventStream', first+1)
    if second >= 0:
        c = c[:second]
# clean trailing
import re
c = re.sub(r'\n(export\s+\{[^\}]+\};?|export\s+default[^\n]+;?)\s*$', '', c, flags=re.S)
c = c.rstrip() + '\n\nexport { EventStream };\nexport default EventStream;\n'
with open(p,'w',encoding='utf-8') as f:
    f.write(c)
print('done')
