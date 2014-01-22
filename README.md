#!/bin/bash
set -e
set -o pipefail

function echoerr { echo "$@" 1>&2; }

BUILDDIR='out'
PUBLISHED_IDS='published_ids.json'
METADATA="${BUILDDIR}/cws.json"
SAMPLES_DIR="../chrome-app-samples"
TRYNOWIMAGE="https://raw.github.com/GoogleChrome/chrome-app-samples/master/tryitnowbutton_small.png"
TMP_OUT="/tmp/__readme__"
rm -f $TMP_OUT
echo "" >$TMP_OUT

#mkdir -p ${SAMPLES_ROOTDIR}
# clone chrome-app-samples repo
#rm -Rf ${SAMPLES_DIR}
#pushd ${SAMPLES_ROOTDIR} >> /dev/null
#echoerr "cloning git repo"
#git clone https://github.com/GoogleChrome/chrome-app-samples.git > /dev/null
#popd >> /dev/null

# get all apps that have manifest.json
pushd ${SAMPLES_DIR} >> /dev/null
MANIFEST_LIST=`find . -name "manifest.json" -not -path "*/dojo/*" | perl -pe "s/\.\/(.*?)\/manifest.json/\1/" | sort`
popd >> /dev/null



function extract_features {
  app=$1
  permissions=$2
  manifest=$3
  features=
  if [ -z "$permissions" ] ; then
    return
  fi
  if echo "$permissions" | grep -q '"webview"'; then
    features="$features webview"
  fi
  if echo "$permissions" | grep -q '"identity"'; then
    features="$features identity"
  fi
  if echo "$permissions" | grep -q '"syncFileSystem"'; then
    features="$features syncFileSystem"
  fi
  if echo "$permissions" | grep -q '"storage"'; then
    features="$features storage"
  fi
  if echo "$permissions" | grep -q '"fileSystem"'; then
    features="$features fileSystem"
  fi
  if echo "$permissions" | grep -q '"mediaGalleries"'; then
    features="$features mediaGallery"
  fi
  if echo "$permissions" | grep -q '"fullscreen"'; then
    features="$features fullscreen"
  fi
  if echo "$permissions" | grep -q '"contextMenus"'; then
    features="$features contextMenu"
  fi
  if echo "$permissions" | grep -q '"socket"'; then
    features="$features socket"
  fi
  if echo "$permissions" | grep -q '"serial"'; then
    features="$features serial"
  fi
  if echo "$permissions" | grep -q '"usb"'; then
    features="$features usb"
  fi
  if echo "$permissions" | grep -q '"bluetooth"'; then
    features="$features bluetooth"
  fi
  if echo "$permissions" | grep -q '"geolocation"'; then
    features="$features geolocation"
  fi
  if echo "$permissions" | grep -q -P '"audioCapture|videoCapture"'; then
    features="$features getUserMedia"
  fi
  if echo "$permissions" | grep -q -P '"pushMessaging'; then
    features="$features pushMessaging"
  fi
  if echo "$permissions" | grep -q -P '"pointerLock'; then
    features="$features pointerLock"
  fi
  if echo "$permissions" | grep -q -P '"notifications'; then
    features="$features richNotifications"
  fi
  if echo "$permissions" | grep -q -P '"system\.'; then
    features="$features systemInfo"
  fi
  if grep -q -P "[\"'\s{]frame[\"']?\s*:\s*[\"']none[\"']" `find $app_dir -name "*.js"`; then 
    features="$features framelessWindows"
  fi
  if grep -q "google.payments.inapp" `find $app_dir -name "*.js"`; then 
    features="$features in-app-payments"
  fi
  if grep -q ".print()" `find $app_dir -name "*.js"`; then 
    features="$features print"
  fi
  if grep -q -P "chrome\.runtime\.(sendMessage|onMessageExternal)" `find $app_dir -name "*.js"`; then 
    features="$features messaging"
  fi
  if [[ -n $(find $app_dir -name "*.dart") ]]; then 
    features="$features dart"
  fi
  if grep -q '"sandbox"' $MF; then
    features="$features sandbox"
  fi
  if grep -q '"optional_permissions"' $MF; then
    features="$features optionalPermissions"
  fi
  echo $features
}

function extract_mobile {
  os=$1
  metadata="$app_dir/sample_support_metadata.json"
  if [ -f "$metadata" ] ; then
    echo `python -c "import json; data = json.load(open('$metadata')); print ( \"%s. %s\" % ( 'Supported', data['$os'].get('comments', '') ) ) if '$os' in data and data['$os'].get('works', True) else '';"`
  fi
}

echo "Sample | API or feature | Screenshot | Link to CWS" >> $TMP_OUT
echo "--- | --- | --- | ---" >> $TMP_OUT

# process each app
declare -g -A features_map
declare -g -A android_map
declare -g -A ios_map
#features_map=()
#android_map=()
#ios_map=()


first="1"
for app in $MANIFEST_LIST ; do

  app_norm=`echo $app | tr '/' '_'`
  app_dir=$SAMPLES_DIR/${app}
  MF=${app_dir}/manifest.json
  TEMP_MF=/tmp/__manifest.json

  if [ ! -f $MF ] ; then
   echoerr "Ignoring ${app}: Could not find manifest file ${MF}" 
   continue
  fi

  grep -v '^\s*//' "$MF" > $TEMP_MF
  MF=$TEMP_MF

  screenshot_html="(no screenshot)"
  screenshot_file="$SAMPLES_DIR/$app/assets/screenshot_1280_800.png"
  screenshot_thumbnail_file="$SAMPLES_DIR/$app/assets/screenshot_thumbnail.png"
  if [ -f $screenshot_file ]; then
    if [ ! -f $screenshot_thumbnail_file ]; then
      convert $screenshot_file -resize 72 "${screenshot_thumbnail_file}"
    fi
    screenshot="https://raw.github.com/GoogleChrome/chrome-app-samples/master/$app/assets/screenshot_1280_800.png"
    screenshot_thumbnail="https://raw.github.com/GoogleChrome/chrome-app-samples/master/$app/assets/screenshot_thumbnail.png"
    screenshot_html="<a target=\"_blank\" href=\"$screenshot\"><img src=\"${screenshot_thumbnail}\"></img></a>" 
  fi

  version=`python -c "import json; data = json.load(open('$MF')); print(data['version']);"`
  permissions=`python -c "import json; data = json.load(open('$MF')); print(json.dumps(data.get('permissions',[])));"`
  supports_android=$(extract_mobile "android")
  supports_ios=$(extract_mobile "ios")
  mobile_features=
  if [ -n "$supports_android" ] ; then
    android_map[$app_norm]="$supports_android"
    mobile_features="android $mobile_features"
  fi
  if [ -n "$supports_ios" ] ; then
    ios_map[$app_norm]="$supports_ios"
    mobile_features="ios $mobile_features"
  fi
  mobile_features_html=`echo $mobile_features | perl -pe "s/\b(\w+)\b/<a href=\"#mobile-support\">\1<\/a>/g"`
  features=$(extract_features $app "$permissions" $MF | tr ' ' '\n' | sort | tr '\n' ' ')
  features_html=`echo $features | perl -pe "s/\b(\w+)\b/<a href=\"#_feature_\1\">\1<\/a>/g"`
  features_html="$features_html $mobile_features_html"
  appid=`python -c "import json; data = json.load(open('$PUBLISHED_IDS')); print(data.get('$app_norm', ''));"`
  if [ -z "$appid" -o "$appid" == "DONTPUBLISH" ] ; then
    cwslink_html="(not published)"
  else
    cwslink="https://chrome.google.com/webstore/detail/$appid"
    cwslink_html="<a target=\"_blank\" href=\"$cwslink\"><img alt=\"Try it now\" src=\"$TRYNOWIMAGE\" title=\"Click here to install this sample from the Chrome Web Store\"></img></a>"
  fi
  for i in $features; do
    features_map[$i]="${features_map[$i]} ${app_norm}"
  done
  app_html="<a name=\"_sample_$app_norm\" href=\"https://github.com/GoogleChrome/chrome-app-samples/tree/master/$app\">$app_norm</a>"
  echo "$app_html | $features_html | $screenshot_html | $cwslink_html" >> $TMP_OUT

done

#expect README.md to have:
# marker of sample table start: "<!-- sample_table_autogen_start THIS TABLE IS AUTOGENERATED! PLEASE, DON'T EDIT IT DIRECTLY! -->"
# marker of sample table end:   "<!-- sample_table_autogen_end THIS TABLE IS AUTOGENERATED! PLEASE, DON'T EDIT IT DIRECTLY! -->"

# marker of feature table start: "<!-- feature_table_autogen_start THIS TABLE IS AUTOGENERATED! PLEASE, DON'T EDIT IT DIRECTLY! -->"
# marker of feature table end:   "<!-- feature_table_autogen_end THIS TABLE IS AUTOGENERATED! PLEASE, DON'T EDIT IT DIRECTLY! -->"


awk -v new_file=$TMP_OUT '
    /!-- sample_table_autogen_start.*/ {print; system("cat " new_file); banner=1; next}
    /!-- sample_table_autogen_end.*/ {banner=0}
    banner {next}
    {print}
' $SAMPLES_DIR/README.md > /tmp/__newreadme
mv /tmp/__newreadme $SAMPLES_DIR/README.md


#### Create the feature table

rm -f $TMP_OUT
echo "API or feature | Samples" >> $TMP_OUT
echo "--- | ---" >> $TMP_OUT

feature_names=`echo ${!features_map[*]} | tr ' ' '\n' | sort | tr '\n' ' '`
# | perl -pe "s/\b(\w+)\b/<a href=\"#\1\">\1<\/a>/g"`
for feature in $feature_names; do
  feature_html="<a name=\"_feature_$feature\"></a>$feature"
  samples=${features_map[$feature]}
  samples_html=""
  for sample in $samples; do
    samples_html+="<a href=\"#_sample_$sample\">$sample</a> "
  done
  echo "$feature_html | $samples_html" >> $TMP_OUT
done

awk -v new_file=$TMP_OUT '
    /!-- feature_table_autogen_start.*/ {print; system("cat " new_file); banner=1; next}
    /!-- feature_table_autogen_end.*/ {banner=0}
    banner {next}
    {print}
' $SAMPLES_DIR/README.md > /tmp/__newreadme
mv /tmp/__newreadme $SAMPLES_DIR/README.md



#### Create the mobile table

rm -f $TMP_OUT
echo "Sample | Android support | iOS support" >> $TMP_OUT
echo "--- | --- | ---" >> $TMP_OUT

for app in $MANIFEST_LIST ; do
  app_norm=`echo $app | tr '/' '_'`

  android="${android_map[$app_norm]}"
  ios="${ios_map[$app_norm]}"
  if [ -n "$android" -o -n "$ios" ] ; then
    sample="<a name=\"_mobile_${app_norm}\" href=\"https://github.com/GoogleChrome/chrome-app-samples/tree/master/$app\">$app_norm</a>"
    echo "$sample | $android | $ios" >> $TMP_OUT
  fi
done

awk -v new_file=$TMP_OUT '
    /!-- mobile_table_autogen_start.*/ {print; system("cat " new_file); banner=1; next}
    /!-- mobile_table_autogen_end.*/ {banner=0}
    banner {next}
    {print}
' $SAMPLES_DIR/README.md > /tmp/__newreadme
mv /tmp/__newreadme $SAMPLES_DIR/README.md
