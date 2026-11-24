import React, { useState } from 'react';
import { CreateMatchDto, PlayerInfo, MatchLiveSnapshot, LiveBroadcastMessage } from '@shared/types';
import { matchLiveService } from '../../api/matchLive.service';
import { resolveColorHex } from '../../utils/colorHelper';
import { ArrowLeft, Save, Users, Shield, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import '../../styles/matchManagement.css';

interface MatchSetupWizardProps {
  initialMatchData?: MatchLiveSnapshot | null;
  onBack: () => void;
  onMatchCreated: (matchId: string) => void;
}

const createEmptyPlayers = (count: number): PlayerInfo[] => {
  return Array.from({ length: count }, (_, idx) => ({
    number: idx + 1,
    name: '',
  }));
};

export const MatchSetupWizard: React.FC<MatchSetupWizardProps> = ({
  initialMatchData,
  onBack,
  onMatchCreated,
}) => {
  const isEditMode = Boolean(initialMatchData);

  // 基础信息
  const [title, setTitle] = useState(initialMatchData?.title || '2026深技大院长杯足球赛');
  const [competitionName, setCompetitionName] = useState(initialMatchData?.competitionName || '深技大院长杯');
  const [venue, setVenue] = useState(initialMatchData?.venue || 'SZTU 北区足球场');
  const [matchType, setMatchType] = useState<'8_aside' | '11_aside'>(initialMatchData?.matchType || '8_aside');
  
  // 半场与全场常规时长设定（智能联动：仅输入半场，全场自动计算为 2 倍）
  const [halfDuration, setHalfDuration] = useState<number>(initialMatchData?.halfDuration || 45);

  // 主队信息 (移除简称，球衣颜色改为手动输入)
  const [homeName, setHomeName] = useState(initialMatchData?.homeTeam.name || '');
  const [homeCollege, setHomeCollege] = useState(initialMatchData?.homeTeam.college || '');
  const [homeColor, setHomeColor] = useState(initialMatchData?.homeTeam.primaryColor || '深蓝');
  const [homeStarters, setHomeStarters] = useState<PlayerInfo[]>(() => {
    if (initialMatchData?.homeTeam.starters && initialMatchData.homeTeam.starters.length > 0) {
      return JSON.parse(JSON.stringify(initialMatchData.homeTeam.starters));
    }
    return createEmptyPlayers(initialMatchData?.matchType === '11_aside' ? 11 : 8);
  });
  const [homeSubs, setHomeSubs] = useState<PlayerInfo[]>(() => {
    if (initialMatchData?.homeTeam.substitutes) {
      return JSON.parse(JSON.stringify(initialMatchData.homeTeam.substitutes));
    }
    return [];
  });

  // 客队信息
  const [awayName, setAwayName] = useState(initialMatchData?.awayTeam.name || '');
  const [awayCollege, setAwayCollege] = useState(initialMatchData?.awayTeam.college || '');
  const [awayColor, setAwayColor] = useState(initialMatchData?.awayTeam.primaryColor || '红色');
  const [awayStarters, setAwayStarters] = useState<PlayerInfo[]>(() => {
    if (initialMatchData?.awayTeam.starters && initialMatchData.awayTeam.starters.length > 0) {
      return JSON.parse(JSON.stringify(initialMatchData.awayTeam.starters));
    }
    return createEmptyPlayers(initialMatchData?.matchType === '11_aside' ? 11 : 8);
  });
  const [awaySubs, setAwaySubs] = useState<PlayerInfo[]>(() => {
    if (initialMatchData?.awayTeam.substitutes) {
      return JSON.parse(JSON.stringify(initialMatchData.awayTeam.substitutes));
    }
    return [];
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 赛制切换时自适应首发名单行数
  const handleSwitchMatchType = (type: '8_aside' | '11_aside') => {
    if (type === matchType) return;
    setMatchType(type);
    const count = type === '8_aside' ? 8 : 11;

    setHomeStarters((prev) => {
      const next = createEmptyPlayers(count);
      for (let i = 0; i < Math.min(prev.length, count); i++) {
        next[i] = { ...prev[i] };
      }
      return next;
    });

    setAwayStarters((prev) => {
      const next = createEmptyPlayers(count);
      for (let i = 0; i < Math.min(prev.length, count); i++) {
        next[i] = { ...prev[i] };
      }
      return next;
    });
  };

  // 首发名单变更
  const handleStarterChange = (
    side: 'home' | 'away',
    index: number,
    field: 'number' | 'name',
    value: string
  ) => {
    const updateList = (list: PlayerInfo[]) => {
      const copy = [...list];
      if (field === 'number') {
        const num = parseInt(value, 10);
        copy[index].number = isNaN(num) ? 0 : num;
      } else {
        copy[index].name = value;
      }
      return copy;
    };

    if (side === 'home') {
      setHomeStarters(updateList);
    } else {
      setAwayStarters(updateList);
    }
  };

  // 替补名单增删改
  const handleAddSub = (side: 'home' | 'away') => {
    const newPlayer: PlayerInfo = {
      number: 12,
      name: '',
    };
    if (side === 'home') {
      setHomeSubs([...homeSubs, newPlayer]);
    } else {
      setAwaySubs([...awaySubs, newPlayer]);
    }
  };

  const handleRemoveSub = (side: 'home' | 'away', index: number) => {
    if (side === 'home') {
      setHomeSubs(homeSubs.filter((_, idx) => idx !== index));
    } else {
      setAwaySubs(awaySubs.filter((_, idx) => idx !== index));
    }
  };

  const handleSubChange = (
    side: 'home' | 'away',
    index: number,
    field: 'number' | 'name',
    value: string
  ) => {
    const updateList = (list: PlayerInfo[]) => {
      const copy = [...list];
      if (field === 'number') {
        const num = parseInt(value, 10);
        copy[index].number = isNaN(num) ? 0 : num;
      } else {
        copy[index].name = value;
      }
      return copy;
    };

    if (side === 'home') {
      setHomeSubs(updateList);
    } else {
      setAwaySubs(updateList);
    }
  };

  // 提交并创建 / 编辑更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 校验基本信息
    if (!title.trim()) {
      setErrorMsg('请填写比赛赛事标题');
      return;
    }
    if (!homeName.trim()) {
      setErrorMsg('请填写主队球队全称');
      return;
    }
    if (!awayName.trim()) {
      setErrorMsg('请填写客队球队全称');
      return;
    }
    if (!halfDuration || halfDuration <= 0) {
      setErrorMsg('请填写有效的半场常规时长（如 45 分钟）');
      return;
    }

    const requiredStarterCount = matchType === '8_aside' ? 8 : 11;

    // 校验主队首发
    for (let i = 0; i < homeStarters.length; i++) {
      const p = homeStarters[i];
      if (!p.name.trim() || !p.number || p.number <= 0) {
        setErrorMsg(`主队首发名单尚未填满：第 ${i + 1} 位球员姓名与球衣号码必填！`);
        return;
      }
    }

    // 校验客队首发
    for (let i = 0; i < awayStarters.length; i++) {
      const p = awayStarters[i];
      if (!p.name.trim() || !p.number || p.number <= 0) {
        setErrorMsg(`客队首发名单尚未填满：第 ${i + 1} 位球员姓名与球衣号码必填！`);
        return;
      }
    }

    // 替补名单过滤掉未填姓名的空行
    const validHomeSubs = homeSubs.filter((p) => p.name.trim().length > 0);
    const validAwaySubs = awaySubs.filter((p) => p.name.trim().length > 0);

    const fullDuration = halfDuration * 2;

    const dto: CreateMatchDto = {
      title: title.trim(),
      competitionName: competitionName.trim() || title.trim(),
      venue: venue.trim() || 'SZTU 足球场',
      matchType,
      halfDuration,
      fullDuration,
      homeTeam: {
        name: homeName.trim(),
        shortName: homeName.trim().slice(0, 4),
        college: homeCollege.trim() || undefined,
        primaryColor: homeColor.trim() || '深蓝',
        starters: homeStarters.map((p) => ({ ...p, name: p.name.trim() })),
        substitutes: validHomeSubs.map((p) => ({ ...p, name: p.name.trim() })),
      },
      awayTeam: {
        name: awayName.trim(),
        shortName: awayName.trim().slice(0, 4),
        college: awayCollege.trim() || undefined,
        primaryColor: awayColor.trim() || '红色',
        starters: awayStarters.map((p) => ({ ...p, name: p.name.trim() })),
        substitutes: validAwaySubs.map((p) => ({ ...p, name: p.name.trim() })),
      },
    };

    try {
      setSubmitting(true);
      let targetMatchId = '';

      if (isEditMode && initialMatchData) {
        const updated = await matchLiveService.updateMatch(initialMatchData.id, dto);
        targetMatchId = updated.id;

        // 发送更新广播
        try {
          const bc = new BroadcastChannel('sztufa_live_bus');
          bc.postMessage({
            type: 'MATCH_LIVE_UPDATE',
            matchId: targetMatchId,
            snapshot: updated,
            timestamp: Date.now(),
          });
          bc.close();
        } catch {
          // ignore
        }
      } else {
        const created = await matchLiveService.createMatch(dto);
        targetMatchId = created.id;

        // 发送 MATCH_CREATED 广播通知展示端及各窗口
        try {
          const bc = new BroadcastChannel('sztufa_live_bus');
          const msg: LiveBroadcastMessage = {
            type: 'MATCH_CREATED',
            matchId: created.id,
            snapshot: created,
            timestamp: Date.now(),
          };
          bc.postMessage(msg);
          bc.close();
        } catch {
          // ignore
        }
      }

      // 保存成功后直接无缝进入操作台
      onMatchCreated(targetMatchId);
    } catch (err: any) {
      setErrorMsg(err.message || '保存失败，请检查网络或后端服务');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mgmt-container" style={{ maxWidth: '1080px' }}>
      {/* 顶部导航 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="mgmt-btn mgmt-btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> 返回比赛列表
        </button>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {isEditMode ? '⚙️ 正在修改比赛信息（未开赛状态）' : '* 标有红色星号的项目为必填项'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 卡片 1: 赛事基本信息与时长配置 */}
        <div className="wizard-box">
          <div className="wizard-section-title">
            <Shield size={18} color="#667eea" />
            1. 比赛基本信息与时长赛制设定
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>赛事标题 *</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：2026深技大院长杯小组赛 A组第1轮"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1.2 }}>
              <label>比赛场地</label>
              <input
                type="text"
                className="form-input"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="例如：SZTU 北区足球场"
              />
            </div>
          </div>

          {/* 半场时长配置与全场联动 */}
          <div className="form-row" style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                <Clock size={15} color="#2563eb" />
                半场常规比赛时长 (分钟) *
              </label>
              <input
                type="number"
                className="form-input"
                value={halfDuration || ''}
                onChange={(e) => setHalfDuration(parseInt(e.target.value, 10) || 0)}
                placeholder="例如：45 或 40、35"
                min="1"
                max="90"
                required
              />
            </div>

            <div style={{ flex: 1.5, paddingLeft: '12px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>
                ⚡ 自动联动全场常规时长：{halfDuration * 2} 分钟
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                上半场常规将在 {halfDuration}' 结束；下半场将于 {halfDuration}:00 准时开球起跑，全场常规将于 {halfDuration * 2}' 结束。
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>赛制模式（限定首发填报人数） *</label>
            <div className="format-selector">
              <div
                className={`format-option ${matchType === '8_aside' ? 'active' : ''}`}
                onClick={() => handleSwitchMatchType('8_aside')}
              >
                <div style={{ fontSize: '1.4rem' }}>🏃</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                    8 人制足球赛
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    限定双方各填写 8 名首发球员，适合院级对抗杯赛
                  </div>
                </div>
              </div>

              <div
                className={`format-option ${matchType === '11_aside' ? 'active' : ''}`}
                onClick={() => handleSwitchMatchType('11_aside')}
              >
                <div style={{ fontSize: '1.4rem' }}>⚽</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                    11 人制标准足球赛
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    限定双方各填写 11 名首发球员，符合 FIFA 标准赛制
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 卡片 2 & 3: 主队与客队阵容并列配置 */}
        <div className="two-col-layout">
          {/* 主队配置 */}
          <div className="wizard-box team-panel" style={{ borderTop: `4px solid ${resolveColorHex(homeColor)}` }}>
            <div className="wizard-section-title" style={{ color: resolveColorHex(homeColor) }}>
              <Users size={18} />
              主队信息 (Home)
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1.5 }}>
                <label>球队全称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={homeName}
                  onChange={(e) => setHomeName(e.target.value)}
                  placeholder="如：大数据与互联网学院"
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>球衣颜色 (手动输入) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    className="team-color-indicator"
                    style={{ backgroundColor: resolveColorHex(homeColor), flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={homeColor}
                    onChange={(e) => setHomeColor(e.target.value)}
                    placeholder="如：红色、纯白、深海蓝"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>所属学院 (选填)</label>
              <input
                type="text"
                className="form-input"
                value={homeCollege}
                onChange={(e) => setHomeCollege(e.target.value)}
                placeholder="例如：大数据与互联网学院"
              />
            </div>

            {/* 主队首发名单 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  首发球员名单 ({matchType === '8_aside' ? '8' : '11'} 人制必填) *
                </label>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                  已配置 {homeStarters.filter(p => p.name.trim()).length} / {matchType === '8_aside' ? 8 : 11} 人
                </span>
              </div>

              {homeStarters.map((player, idx) => (
                <div key={idx} className="starter-row">
                  <span className="index-badge">#{idx + 1}</span>
                  <input
                    type="number"
                    className="form-input"
                    value={player.number || ''}
                    onChange={(e) => handleStarterChange('home', idx, 'number', e.target.value)}
                    placeholder="球员号码"
                    title="球员号码"
                    min="1"
                    max="99"
                    required
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={player.name}
                    onChange={(e) => handleStarterChange('home', idx, 'name', e.target.value)}
                    placeholder={`首发球员 ${idx + 1} 姓名`}
                    required
                  />
                </div>
              ))}
            </div>

            {/* 主队替补名单 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                  替补球员名单 (选填，不限人数)
                </label>
                <button
                  type="button"
                  className="mgmt-btn mgmt-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  onClick={() => handleAddSub('home')}
                >
                  <Plus size={12} /> 添加替补
                </button>
              </div>

              {homeSubs.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '8px 0' }}>
                  暂未添加替补（可随时按上方按钮添加）
                </div>
              ) : (
                homeSubs.map((player, idx) => (
                  <div key={idx} className="sub-row">
                    <input
                      type="number"
                      className="form-input"
                      value={player.number || ''}
                      onChange={(e) => handleSubChange('home', idx, 'number', e.target.value)}
                      placeholder="球员号码"
                      title="球员号码"
                      min="1"
                      max="99"
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={player.name}
                      onChange={(e) => handleSubChange('home', idx, 'name', e.target.value)}
                      placeholder="替补球员姓名"
                    />
                    <button
                      type="button"
                      className="mgmt-btn mgmt-btn-danger"
                      style={{ padding: '6px', justifyContent: 'center' }}
                      onClick={() => handleRemoveSub('home', idx)}
                      title="移除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 客队配置 */}
          <div className="wizard-box team-panel" style={{ borderTop: `4px solid ${resolveColorHex(awayColor)}` }}>
            <div className="wizard-section-title" style={{ color: resolveColorHex(awayColor) }}>
              <Users size={18} />
              客队信息 (Away)
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1.5 }}>
                <label>球队全称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={awayName}
                  onChange={(e) => setAwayName(e.target.value)}
                  placeholder="如：中德智能制造学院"
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>球衣颜色 (手动输入) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    className="team-color-indicator"
                    style={{ backgroundColor: resolveColorHex(awayColor), flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={awayColor}
                    onChange={(e) => setAwayColor(e.target.value)}
                    placeholder="如：红色、纯白、深海蓝"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>所属学院 (选填)</label>
              <input
                type="text"
                className="form-input"
                value={awayCollege}
                onChange={(e) => setAwayCollege(e.target.value)}
                placeholder="例如：中德智能制造学院"
              />
            </div>

            {/* 客队首发名单 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  首发球员名单 ({matchType === '8_aside' ? '8' : '11'} 人制必填) *
                </label>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                  已配置 {awayStarters.filter(p => p.name.trim()).length} / {matchType === '8_aside' ? 8 : 11} 人
                </span>
              </div>

              {awayStarters.map((player, idx) => (
                <div key={idx} className="starter-row">
                  <span className="index-badge">#{idx + 1}</span>
                  <input
                    type="number"
                    className="form-input"
                    value={player.number || ''}
                    onChange={(e) => handleStarterChange('away', idx, 'number', e.target.value)}
                    placeholder="球员号码"
                    title="球员号码"
                    min="1"
                    max="99"
                    required
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={player.name}
                    onChange={(e) => handleStarterChange('away', idx, 'name', e.target.value)}
                    placeholder={`首发球员 ${idx + 1} 姓名`}
                    required
                  />
                </div>
              ))}
            </div>

            {/* 客队替补名单 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                  替补球员名单 (选填，不限人数)
                </label>
                <button
                  type="button"
                  className="mgmt-btn mgmt-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  onClick={() => handleAddSub('away')}
                >
                  <Plus size={12} /> 添加替补
                </button>
              </div>

              {awaySubs.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '8px 0' }}>
                  暂未添加替补（可随时按上方按钮添加）
                </div>
              ) : (
                awaySubs.map((player, idx) => (
                  <div key={idx} className="sub-row">
                    <input
                      type="number"
                      className="form-input"
                      value={player.number || ''}
                      onChange={(e) => handleSubChange('away', idx, 'number', e.target.value)}
                      placeholder="球员号码"
                      title="球员号码"
                      min="1"
                      max="99"
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={player.name}
                      onChange={(e) => handleSubChange('away', idx, 'name', e.target.value)}
                      placeholder="替补球员姓名"
                    />
                    <button
                      type="button"
                      className="mgmt-btn mgmt-btn-danger"
                      style={{ padding: '6px', justifyContent: 'center' }}
                      onClick={() => handleRemoveSub('away', idx)}
                      title="移除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 错误警告提示 */}
        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 底部保存按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '10px' }}>
          <button type="button" className="mgmt-btn mgmt-btn-secondary" onClick={onBack}>
            取消并返回
          </button>
          <button
            type="submit"
            className="mgmt-btn mgmt-btn-primary"
            style={{ padding: '10px 28px', fontSize: '1rem' }}
            disabled={submitting}
          >
            <Save size={18} />
            {submitting ? '正在保存...' : isEditMode ? '保存修改并进入操作台' : '确认创建并进入比赛操作台'}
          </button>
        </div>
      </form>
    </div>
  );
};
