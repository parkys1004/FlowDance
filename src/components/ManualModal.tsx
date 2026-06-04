import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import {
  X, Users, LayoutGrid, Play, LogIn, LogOut,
  Video, Keyboard, MousePointer, Music, Copy, Save,
} from 'lucide-react';

interface Props { onClose: () => void; }

interface Item  { text: string; sub?: string }
interface Section {
  icon: ReactNode;
  color: string;
  title: string;
  items: Item[];
}

const KBD = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex items-center px-2 py-1 rounded-md bg-white/10 border border-white/20 text-xs font-mono text-neutral-200 leading-none">
    {children}
  </kbd>
);

const SECTIONS: Section[] = [
  {
    icon: <Users className="w-4 h-4" />,
    color: 'text-blue-400 bg-blue-500/15',
    title: '팀 멤버 관리',
    items: [
      { text: '멤버 추가', sub: '좌측 패널 하단 이름 입력 → + 버튼 클릭' },
      { text: '이름 수정', sub: '멤버 위에 마우스를 올리면 연필 아이콘이 나타납니다. 클릭 후 수정 → Enter 확인 / Escape 취소' },
      { text: '색상 변경', sub: '좌측 패널 멤버 목록의 색상 원을 클릭하면 컬러 피커가 열립니다. 선택 즉시 스테이지에 반영' },
      { text: '회전 · 턴 편집', sub: '스테이지에서 멤버를 우클릭하면 상세 편집 패널이 열립니다. 회전 각도 조절, 턴(회전 애니메이션) 설정 가능' },
      { text: '멤버 삭제', sub: '멤버 우측 휴지통 아이콘 클릭. 모든 프레임에서 제거됩니다' },
      { text: '전체 삭제', sub: '패널 상단 오른쪽 "전체 삭제" 버튼' },
    ],
  },
  {
    icon: <LayoutGrid className="w-4 h-4" />,
    color: 'text-violet-400 bg-violet-500/15',
    title: '스테이지 조작',
    items: [
      { text: '멤버 이동', sub: '멤버 원을 드래그해 원하는 위치로 이동' },
      { text: '멤버 선택', sub: '멤버 클릭 → 흰색 링 표시, 이름 레이블 고정 표시' },
      { text: '대형 적용', sub: '좌측 패널 "대형 선택" 버튼 클릭 → 모달에서 원하는 대형 선택 → 현재 프레임에 즉시 적용' },
      { text: '미러 모드', sub: '헤더 Mirror Mode 버튼 → 무대 좌우 반전 보기. 관객 시점으로 확인할 때 유용' },
      { text: '프로젝트 이름 변경', sub: '헤더의 프로젝트 이름을 클릭하면 인라인 편집 입력창이 열립니다. Enter 저장 / Escape 취소' },
    ],
  },
  {
    icon: <LayoutGrid className="w-4 h-4" />,
    color: 'text-indigo-400 bg-indigo-500/15',
    title: '대형 선택',
    items: [
      { text: '대형 선택 열기', sub: '좌측 패널 하단 "대형 선택" 버튼 클릭 → 모달이 열립니다' },
      { text: '기본 대형', sub: '일자형·이열횡대·삼열횡대·V자·역V자·원형·다이아몬드·대각선·지그재그·삼각형 총 10가지 제공. 카드 클릭 시 현재 프레임에 즉시 적용' },
      { text: '커스텀 대형 저장', sub: '"커스텀 대형" 탭 → "+ 현재 포지션을 커스텀 대형으로 저장" 클릭 → 이름 입력 후 Enter. 현재 프레임의 모든 멤버 위치가 저장됩니다' },
      { text: '커스텀 대형 적용', sub: '저장된 커스텀 대형 카드를 클릭하면 현재 멤버 순서에 맞춰 포지션이 적용됩니다' },
      { text: '커스텀 대형 삭제', sub: '커스텀 대형 카드에 마우스를 올리면 우측 상단에 🗑️ 아이콘이 표시됩니다. 클릭하여 삭제' },
      { text: '자동 보관', sub: '저장한 커스텀 대형은 브라우저에 자동 저장되어 새로고침 후에도 유지됩니다' },
    ],
  },
  {
    icon: <Play className="w-4 h-4" />,
    color: 'text-emerald-400 bg-emerald-500/15',
    title: '타임라인 & 재생',
    items: [
      { text: '음악 업로드', sub: '타임라인 좌측 "음악 업로드" 버튼 클릭. MP3·WAV·M4A 등 오디오 파일 지원' },
      { text: '프레임(마크) 추가', sub: '원하는 시간에 재생헤드를 놓고 "추가" 버튼 클릭 → 현재 포지션으로 스냅샷 저장' },
      { text: '프레임 복제', sub: '"복제" 버튼 클릭 → 현재 프레임과 동일한 포지션으로 새 프레임 생성' },
      { text: '프레임 이동', sub: '타임라인의 흰 점(마커)을 클릭하면 해당 시점으로 이동' },
      { text: '프레임 설정', sub: '흰 점을 더블클릭 → "무대 이동" 패널에서 모든 멤버를 입장/퇴장 위치로 일괄 이동 가능' },
      { text: '재생헤드 이동', sub: '타임라인 바를 클릭하거나 드래그해 원하는 시점으로 이동' },
      { text: '재생 컨트롤', sub: '◀◀ 맨 앞  /  ◀ 이전 마크  /  ▶ 재생·일시정지  /  ▶ 다음 마크  /  ▶▶ 맨 뒤' },
    ],
  },
  {
    icon: <LogIn className="w-4 h-4" />,
    color: 'text-emerald-400 bg-emerald-500/15',
    title: '입장 마커',
    items: [
      { text: '마커 추가', sub: '좌측 패널 "무대 입퇴장" → 입장 버튼 클릭. 타임라인 시작 전 준비 구간이 생성됩니다' },
      { text: '위치 조정', sub: '스테이지의 초록 입장 마커를 드래그해 원하는 무대 진입 위치로 이동' },
      { text: '준비 시간 설정', sub: '마커 카드의 0s · 5s · 10s · 15s · 20s 버튼으로 음악 전 준비 시간 조절' },
      { text: '레이블 편집', sub: '스테이지에서 마커를 더블클릭 → 이름 변경 가능' },
    ],
  },
  {
    icon: <LogOut className="w-4 h-4" />,
    color: 'text-orange-400 bg-orange-500/15',
    title: '퇴장 마커',
    items: [
      { text: '마커 추가', sub: '좌측 패널 → 퇴장 버튼 클릭. 음악 종료 후 퇴장 구간이 추가됩니다' },
      { text: '위치 조정', sub: '스테이지의 주황 퇴장 마커를 드래그해 퇴장 위치 지정' },
      { text: '퇴장 시간 설정', sub: '마커 카드의 초 버튼으로 음악 후 퇴장 시간 조절' },
    ],
  },
  {
    icon: <Music className="w-4 h-4" />,
    color: 'text-pink-400 bg-pink-500/15',
    title: '애니메이션 미리보기',
    items: [
      { text: '실시간 보간 재생', sub: '재생 버튼을 누르면 프레임 사이 이동 경로가 보간되어 실제 움직임처럼 재생됩니다' },
      { text: '이동 궤적 표시', sub: '현재 선택된 프레임의 이전 프레임으로부터 이동 경로가 점선으로 표시됩니다' },
    ],
  },
  {
    icon: <Copy className="w-4 h-4" />,
    color: 'text-cyan-400 bg-cyan-500/15',
    title: '관중석 & 무대 시각화',
    items: [
      { text: '관중 실루엣', sub: '스테이지 하단(FRONT 방향)에 3줄의 관중 실루엣이 자동 표시됩니다' },
      { text: 'FRONT 방향', sub: '"FRONT" 텍스트 방향이 관객이 보는 앞면입니다. 미러 모드 시 "(MIRROR)" 표시' },
    ],
  },
  {
    icon: <Save className="w-4 h-4" />,
    color: 'text-yellow-400 bg-yellow-500/15',
    title: '프로젝트 저장 & 불러오기',
    items: [
      { text: '자동 저장', sub: '작업 내용은 브라우저에 자동으로 저장됩니다. 페이지를 새로고침해도 마지막 작업 상태가 그대로 복원됩니다' },
      { text: '파일로 저장 (💾)', sub: '헤더 저장 아이콘 클릭 → .flowdance 파일로 내보내기. 다른 기기로 이동하거나 백업할 때 사용' },
      { text: '파일 불러오기 (📂)', sub: '헤더 폴더 아이콘 클릭 → .flowdance 파일 선택 → 프로젝트 복원. 완료 시 하단에 알림 표시' },
      { text: '음악 파일 재업로드', sub: '음악은 파일에 포함되지 않습니다. 불러오기 후 타임라인의 "음악 업로드" 버튼으로 다시 업로드해주세요' },
    ],
  },
  {
    icon: <Video className="w-4 h-4" />,
    color: 'text-blue-400 bg-blue-500/15',
    title: '영상 내보내기',
    items: [
      { text: '내보내기 시작', sub: '헤더 "Export MP4" 버튼 클릭 → 설정 모달이 열립니다' },
      { text: '파일 형식 선택', sub: 'MP4 (H.264) 또는 WEBM (VP9) 선택. 브라우저가 MP4를 지원하지 않으면 자동으로 WEBM으로 저장됩니다' },
      { text: '화면 비율 선택', sub: '16:9 (1280×720, 가로형) 또는 9:16 (720×1280, 세로형 · 쇼츠/릴스용)' },
      { text: '녹화 진행', sub: '내보내기 클릭 시 실시간 녹화가 시작되며 헤더에 진행률이 표시됩니다. 완료 시 자동 다운로드' },
      { text: '녹화 취소', sub: '헤더 진행바 옆 X 버튼 클릭' },
    ],
  },
  {
    icon: <Keyboard className="w-4 h-4" />,
    color: 'text-neutral-300 bg-white/10',
    title: '키보드 단축키',
    items: [],
  },
];

const SHORTCUTS = [
  { keys: ['Space'],           desc: '재생 / 일시정지' },
  { keys: ['←'],              desc: '인디케이터 1초 뒤로' },
  { keys: ['→'],              desc: '인디케이터 1초 앞으로' },
  { keys: ['Shift', '←'],    desc: '인디케이터 5초 뒤로' },
  { keys: ['Shift', '→'],    desc: '인디케이터 5초 앞으로' },
  { keys: ['Enter'],          desc: '이름 편집 확인 (멤버·프로젝트명)' },
  { keys: ['Escape'],         desc: '이름 편집 취소 (멤버·프로젝트명)' },
];

export function ManualModal({ onClose }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-neutral-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 tracking-tight">사용 가이드</h2>
              <p className="text-xs text-neutral-500 mt-0.5">FlowDance 공연동선</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 콘텐츠 (스크롤) */}
        <div className="overflow-y-auto px-6 py-5 space-y-3 flex-1 scrollbar-hide">
          {SECTIONS.map((sec) => (
            <div
              key={sec.title}
              className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5"
            >
              {/* 섹션 타이틀 */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sec.color}`}>
                  {sec.icon}
                </div>
                <h3 className="text-sm font-bold text-neutral-100 tracking-tight">{sec.title}</h3>
              </div>

              {/* 단축키 섹션 */}
              {sec.title === '키보드 단축키' ? (
                <div className="space-y-3">
                  {SHORTCUTS.map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-300">{desc}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && <span className="text-xs text-neutral-600 font-bold">+</span>}
                            <KBD>{k}</KBD>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {sec.items.map((item) => (
                    <li key={item.text} className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-neutral-200">{item.text}</span>
                      {item.sub && (
                        <span className="text-sm text-neutral-400 leading-relaxed">{item.sub}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 border-t border-white/10 shrink-0 flex items-center justify-between">
          <a
            href="https://dancehive.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            <span>🐝</span>
            <span className="font-medium">댄스하이브</span>
            <span className="text-neutral-700">dancehive.app</span>
          </a>
          <p className="text-xs text-neutral-600">
            ESC 또는 바깥 클릭으로 닫기
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
