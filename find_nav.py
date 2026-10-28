import os
res=[]
for root,dirs,files in os.walk(r'E:\Kinetic Models\Frontend\src'):
    for f in files:
        if f.endswith(('.css','.tsx','.scss','.ts')):
            p=os.path.join(root,f)
            try:
                with open(p,encoding='utf-8',errors='ignore') as fh:
                    c=fh.read()
                if 'kinetic-capsule' in c or 'kinetic-tabs' in c:
                    res.append(p)
            except:
                pass
for r in res:
    print(r)
