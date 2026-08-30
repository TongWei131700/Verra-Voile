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

# 6. Château de Vêves (Belgium) - prefix: cv
i=1
for url in \
  "https://chateau-veves.be/wp-content/uploads/2020/07/chaeau_veves.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/visite.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/visite2-1.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/chasse_tresor-1.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/header_histoire.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/histoire_2.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/histoire_3.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/histoire_4.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/histoire_4-1.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/header_activite.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2022/08/header_location.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/fd_reserver2.jpg" \
  "https://chateau-veves.be/wp-content/uploads/2020/07/fd_reserver3-2.jpg"; do
  dl "chateau-de-veves" "cv" "$url" $i; i=$((i+1))
done
echo "chateau-de-veves: $((i-1)) attempted"

# 7. Château Heralec (Czech) - prefix: ch (combined original 5 + extra)
i=1
for url in \
  "https://www.chateauheralec.cz/files/responsive/1920/0/heralec-33.jpg" \
  "https://www.chateauheralec.cz/files/responsive/1920/0/webpnet-resizeimage.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/ouvre-la-porta-kopia.jpg" \
  "https://www.chateauheralec.cz/files/responsive/1920/0/svaty-achacius.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/heralecc.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/dji-0106a.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/dsc7248-small.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/jprerovsky-chateau-heralec-16a2952-upr.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/presidential-suite-panu-ze-solmsu-1-upr.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/jidlo-tmavsi-small.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/sin-predku-1.jpg" \
  "https://www.chateauheralec.cz/files/responsive/1920/0/img-1377jpeg.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/kings-suite-panu-trcku-z-lipy-upr.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/jprerovsky-chateau-heralec-16a1731.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/jprerovsky-chateau-heralec-16a3488.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/jprerovsky-chateau-heralec-16a5096-small.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/her-din.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/dscn1268-scaled.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/heralec-26.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/heralec-13-small.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/heralec.jpg" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/silencarium-herbarium-small.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/2021-spa-facial-treatment-rgb-upr.png" \
  "https://www.chateauheralec.cz/files/responsive/2600/0/virivka.jpeg"; do
  dl "chateau-heralec" "ch" $url $i; i=$((i+1))
done
echo "chateau-heralec: $((i-1)) attempted"

# 8. Károlyi Kastély (Hungary) - prefix: kk
i=1
for url in \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_007.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_040.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_034.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_037.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_005.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_031.JPG" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_012.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_035.JPG" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_025.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Wedding/Accent_Karolyi_Eskuvo_1280_001.jpg" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Hotel/Accent_Karolyi_Szalloda_1280_003.JPG" \
  "https://karolyikastely.accenthotels.com/media/cache/categoryimage/uploads/Karolyi/1280%20-%20Gallery/Restaurant/Accent_Karolyi_Etterem_1280_006.JPG"; do
  dl "karolyi-kastely" "kk" "$url" $i; i=$((i+1))
done
echo "karolyi-kastely: $((i-1)) attempted"

# 9. Pałac Chojnata (Poland) - prefix: pc
i=1
for url in \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9646_male.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9228_male.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9321_male.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/06/Zosia-25do-internetu.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/06/Zosia-36do-internetu.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/06/Zosia-29do-internetu.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/06/Zosia-40do-internetu.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9559_male.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9541_male.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9496_male.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/08/0X7A9285.jpg" \
  "https://palacchojnata.pl/wp-content/uploads/2022/09/przyjecie_w_palacu.jpg"; do
  dl "palac-chojnata" "pc" "$url" $i; i=$((i+1))
done
echo "palac-chojnata: $((i-1)) attempted"

# 10. Dalen Hotel (Norway) - prefix: dh
i=1
for url in \
  "https://static.thatsup.website/628/86614/DSCF8993.jpg?v=1777996754" \
  "https://static.thatsup.website/628/97503/DSCF0374.jpg?v=1787315960" \
  "https://static.thatsup.website/628/86441/DSCF6433.jpg?v=1777895021" \
  "https://static.thatsup.website/628/87780/FUJI4507.jpg?v=1779010862" \
  "https://static.thatsup.website/628/87876/5S0A8903fix.jpg?v=1779036280" \
  "https://static.thatsup.website/628/86718/FUJI3021.jpg?v=1777997525" \
  "https://static.thatsup.website/628/93683/Christmas---Dalen-Hotel.jpg?v=1782978437" \
  "https://static.thatsup.website/628/86650/FUJI3621.jpg?v=1777996915" \
  "https://static.thatsup.website/628/87884/5S0A8893fix.jpg?v=1779036427" \
  "https://static.thatsup.website/628/86758/DSCF7605-2.jpg?v=1777999432" \
  "https://static.thatsup.website/628/86660/DSCF8698.jpg?v=1777996965" \
  "https://static.thatsup.website/628/89914/Rainy-days_exterior-1.jpg?v=1781015981" \
  "https://static.thatsup.website/628/84564/Wedding_byamaliapopv-(73)-1.jpg?v=1776159357"; do
  dl "dalen-hotel" "dh" "$url" $i; i=$((i+1))
done
echo "dalen-hotel: $((i-1)) attempted"

echo "=== Batch 2 (venues 6-10) complete: OK=$OK FAIL=$FAIL ==="
