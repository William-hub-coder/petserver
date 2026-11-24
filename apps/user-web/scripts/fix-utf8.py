from pathlib import Path


def guess(b0: int, b1: int, before: bytes, after: bytes) -> int:
    key = (b0, b1)
    if key == (0xE2, 0x80):
        if after.startswith(b"/button>") and b"close" in before[-50:]:
            return 0xB9  # ‹
        if b"\xe5\x9c\xb0\xe5\x9b\xbe" in before[-30:]:
            return 0xBA  # ›
        if after.startswith(b"/button>") and (before.endswith(b" ") or before.endswith(b"\xe5\x9b\xbe ")):
            return 0xBA
        return 0xA6  # …
    if key == (0xE2, 0x98):
        return 0x85  # ★
    if key == (0xEF, 0xBC):
        return 0x8B  # ＋
    if key == (0xE3, 0x80):
        return 0x82  # 。

    fixed = {
        (0xE9, 0x80): 0x89,  # 选
        (0xE6, 0xA1): 0x88,  # 案
        (0xE5, 0x8A): 0xA0,  # 加
        (0xE6, 0x9C): 0x89,  # 有
        (0xE6, 0x96): 0xB0,  # 新
        (0xE5, 0xBA): 0x97,  # 店
        (0xE5, 0x99): 0xA8,  # 器
        (0xE6, 0xB4): 0x9E,  # 诊 (问诊)
        (0xE5, 0x8C): 0xBA,  # 医
        (0xE6, 0x8A): 0x80,  # 技? fallback via score
        (0xE8, 0xAE): 0xA2,  # 订
        (0xE8, 0xB4): 0xAD,  # 购
        (0xE7, 0xA0): 0x81,  # 码
        (0xE8, 0xAF): 0xA2,  # 询
        (0xE9, 0xA2): 0x84,  # 预 (partial)
        (0xE5, 0x9F): 0x8E,  # 城
        (0xE5, 0x87): 0xBA,  # 出
        (0xE7, 0x8C): 0xAB,  # 猫
        (0xE7, 0x8B): 0x97,  # 狗
        (0xE8, 0xAF): 0x84,  # 评
        (0xE4, 0xB8): 0xAD,  # 中
        (0xE6, 0x9D): 0xA1,  # 条
        (0xE8, 0xB5): 0xB7,  # 起
        (0xE5, 0x8F): 0x82,  # 参
        (0xE4, 0xBB): 0xB6,  # 件
        (0xE7, 0xB4): 0xA2,  # 索
        (0xE5, 0xBD): 0x95,  # 录
        (0xE7, 0x89): 0xA9,  # 物
        (0xE7, 0xA7): 0x8D,  # 种
        (0xE8, 0x8D): 0x90,  # 荐
        (0xE5, 0xBF): 0x83,  # 心
        (0xE7, 0xA0): 0x81,  # 码
        (0xE7, 0xA0): 0x81,
        (0xE7, 0xA0): 0x81,
        (0xE9, 0xA1): 0xB9,  # 项
        (0xE8, 0xB4): 0xB9,  # 费
        (0xE7, 0xA0): 0x81,
        (0xE7, 0xA0): 0x81,
        (0xE5, 0xBE): 0x97,  # 得? 
        (0xE5, 0xBE): 0x97,
        (0xE7, 0xA0): 0x81,
        (0xE7, 0xA0): 0x81,
        (0xE6, 0xB2): 0x99,  # 砂
        (0xE8, 0xB8): 0xAA,  # 踪
        (0xE9, 0x85): 0x8D,  # 配? 配送追
        (0xE5, 0xBE): 0xB7,  # 德
        (0xE8, 0xBD): 0xA6,  # 车
        (0xE5, 0x8A): 0xA9,  # 助
        (0xE7, 0xB2): 0xBE,  # 精?
        (0xE6, 0x9C): 0x9F,  # 期?
        (0xE7, 0xAD): 0x89,  # 等
        (0xE4, 0xBA): 0x86,  # 了
        (0xE5, 0x91): 0x8A,  # 告
        (0xE5, 0x8A): 0x9F,  # 功?
    }
    if key in fixed:
        return fixed[key]

    prefer = set(
        "选案加有新店器码诊疗询预约定单城退出猫狗购车评分帮助条颗起中参件索录物种荐心项费砂踪德助等了告功"
        "问医就医加载费起评条颗参考条件搜索登录宠物品种推荐地图放心训练核销服务"
    )
    best = 0x80
    best_score = -1
    prev = before.decode("utf-8", errors="ignore")
    prev_char = prev[-1] if prev else ""
    for third in range(0x80, 0xC0):
        try:
            ch = bytes([b0, b1, third]).decode("utf-8")
        except Exception:
            continue
        score = 0
        if "\u4e00" <= ch <= "\u9fff":
            score += 2
        if ch in prefer:
            score += 6
        word = prev_char + ch
        commons = [
            "严选",
            "档案",
            "添加",
            "更新",
            "门店",
            "容器",
            "问诊",
            "就医",
            "预约",
            "订单",
            "商城",
            "退出",
            "核销",
            "评价",
            "参考",
            "条件",
            "搜索",
            "登录",
            "宠物",
            "品种",
            "推荐",
            "地图",
            "放心",
            "训练",
            "服务",
            "服务费",
            "猫砂",
            "追踪",
            "配送",
            "高德",
            "购物",
            "购物车",
            "帮助",
            "加载",
            "确认",
            "条评",
            "货源",
            "销量",
            "价格↑",
            "价格↓",
        ]
        if any(word in c for c in commons) or word in "".join(commons):
            score += 12
        if score > best_score:
            best_score = score
            best = third
    return best


def fix_file(path: Path) -> bool:
    data = path.read_bytes()
    out = bytearray()
    i = 0
    changed = 0
    while i < len(data):
        if (
            i + 2 < len(data)
            and 0xE0 <= data[i] <= 0xEF
            and 0x80 <= data[i + 1] <= 0xBF
            and data[i + 2] == 0x3F
        ):
            third = guess(data[i], data[i + 1], bytes(out[-60:]), data[i + 3 : i + 50])
            out.extend([data[i], data[i + 1], third])
            i += 3
            changed += 1
        else:
            out.append(data[i])
            i += 1
    raw = bytes(out)
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        print("STILL BAD", path, e)
        # dump nearby
        pos = e.start
        print(raw[max(0, pos - 20) : pos + 20])
        return False
    # normalize newlines for vue
    path.write_bytes(text.replace("\r\n", "\n").encode("utf-8"))
    print("OK", path.relative_to(path.parents[2]), "fixes", changed)
    return True


def main() -> None:
    root = Path(r"d:\petserver\apps\user-web\src")
    files = []
    for p in root.rglob("*"):
        if p.suffix not in {".vue", ".css", ".ts", ".md"}:
            continue
        try:
            p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            files.append(p)
    print("to fix", len(files))
    ok = sum(1 for p in files if fix_file(p))
    print("done", ok, "/", len(files))


if __name__ == "__main__":
    main()
