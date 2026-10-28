f = open(r'E:\Kinetic Models\dumplive_out.txt')
lines = f.readlines()
f.close()
for l in lines[-200:]:
    print(l, end='')
