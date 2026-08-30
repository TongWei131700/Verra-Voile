#!/bin/bash
BASE="/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled"
OK=0; FAIL=0

dl() {
  local dir="$1" prefix="$2" url="$3" idx="$4"
  local out=$(printf "%s/%s/%s-%03d.jpg" "$BASE" "$dir" "$prefix" "$idx")
  curl -sL -o "$out" --connect-timeout 15 --max-time 30 "$url" 2>/dev/null
  local sz=$(stat -f%z "$out" 2>/dev/null || echo 0)
  if [ "$sz" -lt 5000 ]; then rm -f "$out"; FAIL=$((FAIL+1)); return 1; fi
  local ft=$(file -b "$out" | head -c 20)
  if echo "$ft" | grep -qi "html\|text\|empty"; then rm -f "$out"; FAIL=$((FAIL+1)); return 1; fi
  OK=$((OK+1))
  return 0
}

# schloss-fall-keila-joa (Estonia) - prefix: sf
i=1
for url in \
  "https://upload.wikimedia.org/wikipedia/commons/8/89/Keila-Joa_manor_house_in_June_2022.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/3/39/Keila-Joa_manor_house_in_June_2022_0098.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/6/64/Keila-Joa_m%C3%B5isa_peahoone_1_-_OlariPilnik.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/8/8d/Keila-Joa_m%C3%B5isa_peahoone_2_-_OlariPilnik.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/b/b7/Keila-Joa_m%C3%B5isa_peahoone_3_-_OlariPilnik.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/1/16/Keila-Joa_m%C3%B5isa_peahoone_2015_2.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/e/e4/Keila-Joa_m%C3%B5isa_peahoone_2015_3.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/a/a7/Keila-Joa_m%C3%B5isa_peahoone_2018.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/7/7b/Keila-Joa_m%C3%B5isa_peahoone_2015_1.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/6/6a/Keila-Joa_m%C3%B5isa_peahoone_%C3%B5hust_ida_k%C3%BClg.JPG" \
  "https://upload.wikimedia.org/wikipedia/commons/8/8b/Keila-Joa_m%C3%B5isa_peahoone_suvel.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/e/ef/Keila-Joa_loss_%28Schloss_Fall%29.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/5/5f/Keila-Joa_m%C3%B5isa_v%C3%A4ravahoone_2018.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/c/c6/Keila-Joa_m%C3%B5isa_peahoone%2C_1831-1833.jpg"; do
  dl "schloss-fall-keila-joa" "sf" "$url" $i; i=$((i+1))
done
echo "schloss-fall-keila-joa: $((i-1)) attempted, OK so far: $OK"

# palazzo-parisio (Malta) - prefix: pp
i=1
for url in \
  "https://upload.wikimedia.org/wikipedia/commons/8/82/Palazzo_Parisio_and_Gardens.jpeg" \
  "https://upload.wikimedia.org/wikipedia/commons/7/7d/Palazzo_Parisio%2C_Naxxar.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/6/62/Palazzo_Scicluna%2C_now_Parisio_10.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/4/4e/%21%21_Palazzo_Scicluna%2C_now_Parisio_09.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/e/e9/%21%21%21_Palazzo_Scicluna%2C_now_Parisio_05.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/7/79/%21%21%21_Palazzo_Scicluna%2C_now_Parisio_06.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/f/f3/Palazzo_Scicluna%2C_now_Parisio_07.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/9/97/Palazzo_Parisio%2C_Naxxar%2C_Malta.11.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/7/76/Palazzo_Parisio%2C_Naxxar%2C_Malta.17.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/7/77/Palazzo_Parisio%2C_Naxxar%2C_Malta.14.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/a/ac/Palazzo_Parisio%2C_Naxxar%2C_Malta.12.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/f/ff/Palazzo_Parisio%2C_Naxxar%2C_Malta.13.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/2/22/Palazzo_Parisio_2015-08-20.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/d/d8/Palazzo_Parisio_Interior_09.jpg"; do
  dl "palazzo-parisio" "pp" "$url" $i; i=$((i+1))
done
echo "palazzo-parisio: $((i-1)) attempted, OK so far: $OK"

# karolyi-kastely (Hungary) - prefix: kk (additional images)
i=5
for url in \
  "https://upload.wikimedia.org/wikipedia/commons/4/4a/Feh%C3%A9rv%C3%A1rcsurg%C3%B3%2C_K%C3%A1rolyi-kast%C3%A9ly.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/8/84/K%C3%A1rolyi-kast%C3%A9ly_%283637._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29_7.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/f/f1/Feh%C3%A9rv%C3%A1rcsurg%C3%B3_K%C3%A1rolyi_Mansion_main_facade.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/2/26/Feh%C3%A9rv%C3%A1rcsurg%C3%B3_K%C3%A1rolyi_Mansion_courtyard_facade.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/c/c4/Feh%C3%A9rv%C3%A1rcsurg%C3%B3_K%C3%A1rolyi_Mansion_chapel.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/6/6e/Feh%C3%A9rv%C3%A1rcsurg%C3%B3_K%C3%A1rolyi_Mansion_Lace_terrace.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/0/0d/Feh%C3%A9rv%C3%A1rcsurg%C3%B3_K%C3%A1rolyi_Mansion_stable.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/6/62/Fehervarcsurgo_kastelycivertanlegi4.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/f/f3/Fehervarcsurgo_kastelycivertanlegi1.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/f/f9/Fehervarcsurgo_kastelycivertanlegi3.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/9/90/K%C3%A1rolyi-kast%C3%A9ly_%C3%A9s_park%2C_Feh%C3%A9rv%C3%A1rcsurg%C3%B3_%283637._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/f/fb/K%C3%A1rolyi-kast%C3%A9ly%2C_Feh%C3%A9rv%C3%A1rcsurg%C3%B3_%283637._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29%2C_homlokzat.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/b/bf/K%C3%A1rolyi_kast%C3%A9ly_4.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/a/af/K%C3%A1rolyi_kast%C3%A9ly_3.jpg"; do
  dl "karolyi-kastely" "kk" "$url" $i; i=$((i+1))
done
echo "karolyi-kastely: $((i-5)) attempted, total OK: $OK FAIL: $FAIL"
