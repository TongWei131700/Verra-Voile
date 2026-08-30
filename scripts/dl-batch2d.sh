#!/bin/bash
BASE="/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled"
OK=0; FAIL=0

dl() {
  local dir="$1" prefix="$2" url="$3" idx="$4"
  local out=$(printf "%s/%s/%s-%03d.jpg" "$BASE" "$dir" "$prefix" "$idx")
  curl -sL -o "$out" --connect-timeout 15 --max-time 30 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" "$url" 2>/dev/null
  local sz=$(stat -f%z "$out" 2>/dev/null || echo 0)
  if [ "$sz" -lt 5000 ]; then rm -f "$out"; FAIL=$((FAIL+1)); return 1; fi
  local ft=$(file -b "$out" | head -c 20)
  if echo "$ft" | grep -qi "html\|text\|empty"; then rm -f "$out"; FAIL=$((FAIL+1)); return 1; fi
  OK=$((OK+1))
  return 0
}

# 17. Château d'Urspelt (Luxembourg) - prefix: cu
i=1
for url in \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2026/01/Automne-2.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2021/05/CGP_3239-Avec-accentuation-Bruit.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/05/CGP_3607-Avec-accentuation-Bruit.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/07/DSC_1774.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/05/CGP_0637-Avec-accentuation-Bruit.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/08/CGP_6432.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2026/01/CGP_1858.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2026/07/CGP_6161.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/08/CGP_7519.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2026/01/CGP_1487.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/08/CGP_6868.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/08/CGP_7346.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/11/CGP_6967.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2026/01/CGP_1305.jpg" \
  "https://www.chateau-urspelt.lu/wp-content/uploads/2025/08/CGP_8267.jpg"; do
  dl "chateau-urspelt" "cu" "$url" $i; i=$((i+1))
done
echo "chateau-urspelt: $((i-1)) attempted"

# 18. Smolenice Castle (Slovakia) - prefix: sc
i=1
for url in \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/95/Congress1-95e63217.jpeg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/88/terasa-HDRm-88f30956.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/82/2-82b15240.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/9c/chodba-HDR-9cc4b074.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/b7/1777032271836-b7a3eabb.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/11/Smolenice_Sept2022_PhotoMartini_lowres_203-115447b9.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/b9/room_23-001-b987cc75.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/e2/room_51-003-e245a670.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/6a/room_21-007-6a891608.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/c6/Smolenice_Sept2022_PhotoMartini_lowres_157-c64f32be.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/77/dolne-nadvorie-1-777c09e1.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/13/Smolenice_Sept2022_PhotoMartini_lowres_141-1371a21c.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/b4/Smolenicky-zamok-b41ebca9.jpg" \
  "https://smolenickyzamok.sav.sk/wp-content/uploads/yootheme/cache/4e/Galeria1-4e0f542f.jpeg"; do
  dl "smolenice-castle" "sc" "$url" $i; i=$((i+1))
done
echo "smolenice-castle: $((i-1)) attempted"

# 19. Villa Dubrovnik (Croatia) - prefix: vd
i=1
for url in \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/03/hero-slider-1.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/03/hero-slider-3.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/03/hero-slider-4.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2025/08/Beach1-HD.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2025/08/VillaDubrovnik9-HD.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2025/08/VillaDubrovnik1-Medium.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2025/08/VillaDubrovnik2-Medium.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/07/VD_22_0859.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/07/VD_22_3413.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/07/spring.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/03/DSCF1888.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/07/Villa-10071.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/07/Villa-1003-1.jpg" \
  "https://www.villa-dubrovnik.hr/wp-content/uploads/2024/09/VILLA-SPA-SUNDECK.jpg"; do
  dl "villa-dubrovnik" "vd" "$url" $i; i=$((i+1))
done
echo "villa-dubrovnik: $((i-1)) attempted"

# 20. Hotel Rangá (Iceland) - prefix: hr
i=1
for url in \
  "https://hotelranga.is/wp-content/uploads/2025/08/inki.music-256-1.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/08/inki.music-282.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/08/Bathroom.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/08/Master_Icelandic.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/08/Junior_N-America-1.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/07/inki.music-104.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/06/deluxe-superior.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/06/Inki-18.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/06/Inki-11.jpg" \
  "https://hotelranga.is/wp-content/uploads/2025/06/Inki-14.jpg" \
  "https://hotelranga.is/wp-content/uploads/2022/04/NL-1.jpg" \
  "https://hotelranga.is/wp-content/uploads/2020/07/3.jpg" \
  "https://hotelranga.is/wp-content/uploads/2020/07/meetingscelebration.jpg" \
  "https://hotelranga.is/wp-content/uploads/2020/07/opening.jpg" \
  "https://hotelranga.is/wp-content/uploads/2021/01/honeymoon.jpg"; do
  dl "hotel-ranga" "hr" "$url" $i; i=$((i+1))
done
echo "hotel-ranga: $((i-1)) attempted"

# 21. Palazzo Parisio (Malta) - prefix: pp - Wix images
i=1
for url in \
  "https://static.wixstatic.com/media/953714_25dc596207414274b11eb68c41a46d30~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_38fd482e57314cbdaf495e36ec40c4d0~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_ef2f2475f42544329721dd5f6157b429~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_56337086ec8d4b54adb116eb093f1557~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_02d92b0eab9b483399bf92cd7fde2177~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_a16b805f1357478ba666c8db86f0911d~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_be56284e744243d2b6e4255bd7ca8009~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_1ba298ca83f8468ab3114330bd886474~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_7835b1b3697743e897ca748e6f4ee64e~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_b778fb745a1546198347779820002d33~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_c6c5a3fa8911492a820bf74c5df54fca~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_86d1f4f435cb4055b3a937549ae30c34~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_0aaa0f60f0d34ec0b4a1bde54f03ca26~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_3c4892b4a8494b79b930ef598056da50~mv2.jpg" \
  "https://static.wixstatic.com/media/953714_61d8fdd14e144cd1a5ae6e6611183a1b~mv2.jpg"; do
  dl "palazzo-parisio" "pp" "$url" $i; i=$((i+1))
done
echo "palazzo-parisio: $((i-1)) attempted"

echo "=== Batch 4 (venues 17-21) complete: OK=$OK FAIL=$FAIL ==="
