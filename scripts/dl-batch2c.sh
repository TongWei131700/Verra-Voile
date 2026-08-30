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

# 11. Dvorec Zemono (Slovenia) - prefix: dz
i=1
for url in \
  "https://www.dvoreczemono.si/images/dvorec-zemono-poroke-01.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-poroke-02.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-poroke-03.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-poroke-04.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-01.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-02.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-04.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-07.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-08.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-09.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-11.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-fotografiranje-poroke-12.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-o-nas-01.jpg" \
  "https://www.dvoreczemono.si/images/dvorec-zemono-o-nas-02.jpg"; do
  dl "dvorec-zemono" "dz" "$url" $i; i=$((i+1))
done
echo "dvorec-zemono: $((i-1)) attempted"

# 12. Tertti Manor (Finland) - prefix: tm
i=1
for url in \
  "https://tertinkartano.fi/wp-content/uploads/2021/05/veranta_kartano.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2021/05/tertin-kartano-2020-8-1200x800.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2021/02/tertin-kartano-kartanohotelli_9-kopio.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2021/08/ravintola_syksy3.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2022/01/ravintola-tertin-kartano.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2022/03/tertin-kartano-hotelli-1.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2020/01/dsc_0632-e1578039787311.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2019/08/ravintola14.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2019/08/haat1.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2019/05/yrttitarha3.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2020/05/tertin-kartano-1287-scaled.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2020/03/veranta_luxury.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2021/02/tertin-kartano-kartanohotelli_14-kopio.jpg" \
  "https://tertinkartano.fi/wp-content/uploads/2019/08/terttipiha2.jpg"; do
  dl "tertti-manor" "tm" "$url" $i; i=$((i+1))
done
echo "tertti-manor: $((i-1)) attempted"

# 13. Schloss Fall / Keila-Joa (Estonia) - prefix: sf - Wix images
i=1
for url in \
  "https://static.wixstatic.com/media/a69ccf_94b249d5aa65416cb5a98e1db329b1de~mv2.jpg/v1/fill/w_1960,h_772,al_t,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/a69ccf_94b249d5aa65416cb5a98e1db329b1de~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_2beec61740cb438ab32180136677884e~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_807d176d02934b60bb21e31362d7282a~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_b45191810c7a4d8c8e3b5f4ef518fbaf~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_7af448426ebf45f09cf5a970fa4a2279~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_294ee229b6db42e78970bd08ccd8b3db~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_67f55ab6c32a4603a1a73095a1f5db43~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_3555766c60354864990fe588e20b0633~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_91fe8dc3ebf34f2b8768c1deab4fa9f3~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_186d73d6afe44cf3b90caf38e30b75fa~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_0bbf401fb9f14b12a3e53de20bd95184~mv2.jpg" \
  "https://static.wixstatic.com/media/a69ccf_710bb158eb554f41bc3435aba6d7cc35~mv2.jpg"; do
  dl "schloss-fall-keila-joa" "sf" "$url" $i; i=$((i+1))
done
echo "schloss-fall-keila-joa: $((i-1)) attempted"

# 14. Birīni Castle (Latvia) - prefix: bc - Wikimedia
i=1
for url in \
  "https://upload.wikimedia.org/wikipedia/commons/c/ca/B%C4%ABri%C5%86i_Palace_2020.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/6/66/B%C4%ABri%C5%86i_Palace_viewed_from_the_water_tower.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/2/27/Biri%C5%86i_palace_-_panoramio.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/e/e9/Birini_manor_house_-_ainars_br%C5%ABvelis_-_Panoramio.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/e/ed/B%C4%ABri%C5%86u_pils.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/20090730-IMG_6976._B%C4%ABri%C5%86u_pils.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/7/73/20090730-IMG_6975._B%C4%ABri%C5%86u_pils.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/8/85/20090730-IMG_6979._B%C4%ABri%C5%86u_pils.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/b/bc/20090730-IMG_6981._B%C4%ABri%C5%86u_pils.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/4/44/B%C4%ABri%C5%86i_manor_watermill%27s_second_life_-_panoramio.jpg"; do
  dl "birini-castle" "bc" "$url" $i; i=$((i+1))
done
echo "birini-castle: $((i-1)) attempted"

# 15. Bistrampolis Manor (Lithuania) - prefix: bm
i=1
for url in \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/viesbutis_skiltis.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/Dvaro_vidus_-41.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/zirgai-3.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/Gyvunai-5.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/Dvaro_vidus_-43.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/Dvaro_vidus_-42.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/Dvaro_vidus_-44.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2023/01/Dvaro_vidus_-39.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/22425943_1417641698285020_989293633_o-1.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/2016-06-01-131.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/baltoji.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/dekoravimas.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/Birzelio-pirmasis-savaitgalis-Monika-ir-Vytautas.jpg" \
  "https://bistrampolis.lt/wp-content/uploads/2022/11/didzioji.jpg"; do
  dl "bistrampolis-manor" "bm" "$url" $i; i=$((i+1))
done
echo "bistrampolis-manor: $((i-1)) attempted"

# 16. Hotel Löwen (Liechtenstein) - prefix: hl
i=1
for url in \
  "https://www.hotel-loewen.li/wp-content/uploads/slider1.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/slider2.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/slider3.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/slider4.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/slider5.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/startbox1.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/startbox2.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/Saal-1.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/saal-rotated.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/anlaesse1-800x535.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/anlaesse2-800x568.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/anlaesse3-800x525.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/anlaesse4-800x1196.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/anlaesse5.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/IMG_1026.jpg" \
  "https://www.hotel-loewen.li/wp-content/uploads/IMG_0473.jpg"; do
  dl "hotel-loewen" "hl" "$url" $i; i=$((i+1))
done
echo "hotel-loewen: $((i-1)) attempted"

echo "=== Batch 3 (venues 11-16) complete: OK=$OK FAIL=$FAIL ==="
