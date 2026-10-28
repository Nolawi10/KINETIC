with open(r'E:\Kinetic Models\Frontend\src\routes\live.tsx', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if i > 100:
            print(line.rstrip())
