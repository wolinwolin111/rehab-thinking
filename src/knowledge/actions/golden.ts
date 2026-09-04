/**
 * 迁移后界面应显示的成品字符串锁（与迁移前基线逐字锚定）。
 * 规则：模板抄错时修模板，不改本文件；历史条目永不删除——它们是回归基线
 * 与「当时界面长什么样」的存证。
 */
export const GOLDEN_OUTPUTS: Record<string, string> = {
  "assessment.how:knee-calf": "扶住墙，双脚慢慢踮起再落下，做5次。两边都能稳定完成时，再分别用单脚试做。",
  "assessment.pro:knee-calf": "双脚踮脚尖10个；允许时再左右单脚各做最多10个。",
  "assessment.how:knee-heel-raise": "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成10次。",
  "assessment.pro:knee-heel-raise": "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成10次。",
  "assessment.how:ankle-calf": "扶住墙，双脚慢慢踮起再落下，做5次。能稳定完成时，再分别用单脚试做。",
  "assessment.pro:ankle-calf": "先双脚提踵10个；稳定后扶墙做单脚提踵，最多记录10个高质量次数。",
  "assessment.how:ankle-heel-raise": "扶住墙，双脚慢慢踮起再落下，做5次。",
  "assessment.pro:ankle-heel-raise": "先双脚同步提踵10个，再根据耐受做单脚提踵。",
  "assessment.how:calf-heel-raise-strength": "扶墙做10次双脚提踵；稳定时再分别单脚尝试。",
  "assessment.pro:calf-heel-raise-strength": "扶墙做10次双脚提踵；稳定时再分别单脚尝试。",
  "assessment.how:calf-heel-raise": "扶墙做10次双脚提踵。",
  "assessment.pro:calf-heel-raise": "扶墙做10次双脚提踵。",
  "treatment.do:ankle-medial-control": "坐着，用脚趾把地上的毛巾一点点抓向自己，做 5 次；再扶墙做 5 个双脚踮脚尖。",
  "treatment.do:ankle-achilles-load": "先确认没有突然断裂的感觉、也没有踩不实的情况，再扶墙做一组5～8个双脚踮脚尖。",
  "training.how:knee-calf-raise": "双手轻扶墙，脚跟垂直抬起，停1秒后缓慢落下。",
  "training.how:calf-back-standing-raise": "扶墙站立，两侧脚跟同时抬起，再缓慢落下。",
  "training.how:calf-medial-arch": "站稳，脚趾放松贴地，轻轻踮脚尖再放下。",
  "training.how:calf-back-seated-raise": "坐稳，前脚掌踩地，缓慢抬起脚跟再放下。",
  "training.how:ankle-achilles-isometric": "坐稳，前脚掌踩地，缓慢抬起脚跟到可接受高度，保持30秒（均匀呼吸不憋气）再轻轻放下。",
  "training.how:ankle-band-heelraise": "按力量缺口选1～2个弹力带方向，再做双脚提踵。",
};
