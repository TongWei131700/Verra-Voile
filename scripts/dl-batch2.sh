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

# 1. Schloss Elmau (Germany) - prefix: se
i=1
for url in \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/TM_03140.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/DJI_0404-Pano.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/retreat_summer/B0012825.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/9_DSC2321.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/TM_03778.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_winter/Ko___enig-12.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/herbstvalley.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/buchhandlungklein.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/schloss_summer/10c_59028140.jpg" \
  "https://www.schloss-elmau.de/fileadmin/bildergalerie/retreat_summer/D1190469-Bearbeitet_Kopie.jpg" \
  "https://www.schloss-elmau.de/fileadmin/Website/00_Hideaway/Konzertsaal/IMG_9647.jpeg"; do
  dl "schloss-elmau" "se" "$url" $i; i=$((i+1))
done
echo "schloss-elmau: $((i-1)) done"

# 2. Huis Bergh (Netherlands) - prefix: hb - webp URLs, download then convert
i=1
for url in \
  "https://huis-bergh.transforms.svdcdn.com/production/Headers/dronebeeld-kasteel.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/kasteel-vanaf-de-wal.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/fontein-kasteeltuin.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/buiten-terras-ronde-toren.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/poortgebouw-vanaf-kruidentuin.JPG?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/voorburcht-van-boven.JPG?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/donjon.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/Huwelijk/bruidspaar-in-dekasteeltuin.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/Huwelijk/bruidspaar-in-de-tuin-met-tent.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/Huwelijk/bruidspaar-op-bordes.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/Huwelijk/bruidspaar-op-de-wal.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/Huwelijk/Styled-Wedding-Shoot-Huis-Bergh-The-Wedding-Shooters-13.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/kus-huwelijk.jpg?w=1200" \
  "https://huis-bergh.transforms.svdcdn.com/production/Headers/bruidspaar-op-de-wal-kijkend-naar-kasteel.jpg?w=1200"; do
  dl "huis-bergh" "hb" "$url" $i; i=$((i+1))
done
echo "huis-bergh: $((i-1)) done"

# 3. Dragsholm Slot (Denmark) - prefix: ds - webp URLs
i=1
for url in \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69a033a74942f60f94be7c20_0ace93bb1a30ba2ac145eb207a944ae9_hero-castle.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e595e4ceb4d35afb16d0_0e907baab4c08e33a0e2a9269af75f3a_Dragsholm%20slot%20set%20fra%20fulgeperspektiv%20%282%29.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e596b8d015f4e952b667_deb7ffd0381e27a2bb6e559846235c8c_Dragsholm%20slot%20Madhus%20natur.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e593c30723e850afcc0a_103b30ead73fa2f824d42b92423361eb_Dragsholm-Castle_Nature_Claus%20Starup_06.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e594fa76f5a6b0d3ea73_587cecd1ca1a3872c81a5bf03079bbee_Dragsholm_Slot_Foto_Starup%20%285%29.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e5944d3e7320b704a395_d77efc30ebeb0db3a5f32a2d683714fd_Dragsholm%20slot%20sne%20%281%29.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e594a561e55ea1e80532_f0a27f07e70fd849877137076e6288be_Dragsholm%20Slot%20f%C3%B8r%20solopgang%20med%20ma%CC%8Ager_NY.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e593e4ceb4d35afb165d_127d3b18a20fc9d7e6a71b2e572c58fe_Dragsholm%20slot%20%283%29.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d3e593d66a80f2eda3cedc_e1b261f093a76f8d0b8d8f084b4ac4df_7%20Dragsholm%20Slot.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d4e9ed855db8ef49f81fa9_8c93842ba895c1f24117a58c0b980ea0_DH-slot-2541.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d4e9ef4c6a89e78b54c93c_6114e614864b079925dc6499a20548fa_20260612-DSC04845.webp" \
  "https://cdn.prod.website-files.com/699e2710cea8f02b3d0dc1b8/69d4ed20855db8ef49f8a0e0_fa03843a14cde1ed5f664b00897b0a90_DSC03107.webp"; do
  dl "dragsholm-slot" "ds" "$url" $i; i=$((i+1))
done
echo "dragsholm-slot: $((i-1)) done"

# 4. Ashford Castle (Ireland) - prefix: ac
i=1
for url in \
  "https://prod-media.redcarnationhotels.com/media/qtjoy2bn/ashford-castle-exterior-1.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/25ematcj/ashford-castle-exterior_resized.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/fikddlhu/ashford-castle-exterior.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/1wggo25i/ashford-castle-walled-garden-6.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/tv2hclqe/ashford-castle-the-oak-hall-lounge.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/2kkjnwn5/ashford-castle-oak-hall.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/ygmp2q3f/ashford-castle-the-george-v-interior-1.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/wiolfq34/ashford-castle-wine-cellar-6.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/lhbd45i3/ashford-castle-afternoon-tea.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/ecjdthff/ashford-castle-spa-pool_2.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/pzbjd30w/olivia-buckley-international-story-of-eve1.jpg?width=1200&format=jpg&quality=80" \
  "https://prod-media.redcarnationhotels.com/media/shybv2vl/olivia-buckley-international-photographed-by-christina-brosnan-1.jpg?width=1200&format=jpg&quality=80"; do
  dl "ashford-castle" "ac" "$url" $i; i=$((i+1))
done
echo "ashford-castle: $((i-1)) done"

# 5. Rosersbergs Slott (Sweden) - prefix: rs - webp URLs
i=1
for url in \
  "https://v.imgi.no/prod-17578-09919ac7eba6e777a816c32e6c7f1fc5-768x432/dscf9140.webp" \
  "https://v.imgi.no/prod-16893-dc6663c182e4d0db67f5327dded95cd9-5464x8192__w=768_cropmode=FITWIDTH/img-1185.webp" \
  "https://v.imgi.no/prod-17592-a3723b785aa7b831e52e41ece3ea9ee9-768x1024/dscf8540.webp" \
  "https://v.imgi.no/prod-16781-ddc8e533f5441931b009591ab8d93b52-3074x4611__w=768_cropmode=FITWIDTH/dsc03585.webp" \
  "https://v.imgi.no/prod-17832-85e8751d66938b5e2b5f412acd4df7af-768x1024/dscf9145.webp" \
  "https://v.imgi.no/prod-17622-890fc4ef2ef470af0e7246b83061baea-768x575/dscf8548.webp" \
  "https://v.imgi.no/prod-17319-a2c5c6f7218af7c8f213fecc67cb14f8-768x1152/img_1955.webp" \
  "https://v.imgi.no/prod-17886-e6cf8b6ce2c812e850b39cf7b9ac373c-768x576/dscf8697.webp" \
  "https://v.imgi.no/prod-16739-7e07a670e157ac8e282c673b2535175f-768x511/dsc04819.webp" \
  "https://v.imgi.no/prod-18144-74e26ba74c8f7b8f3254338447380f58-768x432/namnlos-1920-x-1080-px-22.webp" \
  "https://v.imgi.no/prod-17809-93a4b4c355f6985493f727013e19890d-768x1152/dscf1858.webp" \
  "https://v.imgi.no/prod-17769-23cb38ed9da74beebd7694460293ae31-768x576/dscf8530.webp"; do
  dl "rosersbergs-slott" "rs" "$url" $i; i=$((i+1))
done
echo "rosersbergs-slott: $((i-1)) done"

echo "=== Batch 1 (venues 1-5) complete: OK=$OK FAIL=$FAIL ==="
