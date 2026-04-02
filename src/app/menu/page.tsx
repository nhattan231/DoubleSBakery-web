'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Spin, Empty } from 'antd';
import {
  PhoneOutlined, EnvironmentOutlined, ClockCircleOutlined,
  FacebookOutlined, InstagramOutlined, LinkOutlined,
  MailOutlined, ArrowLeftOutlined, ShoppingCartOutlined,
  StarFilled, LeftOutlined, RightOutlined, CloseOutlined,
  CopyOutlined, DeleteOutlined, PlusOutlined, MinusOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import { storeSettingsApi, categoriesApi } from '@/lib/api';
import type { StoreSettings, CategoryWithProducts, Product } from '@/types';
import { formatCurrency } from '@/lib/format';

// ===== localStorage Cache Helper (TTL 1 giờ) =====
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms
const CACHE_KEY_SETTINGS = 'menu_cache_settings';
const CACHE_KEY_MENU = 'menu_cache_menu';

function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCachedData(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, expiry: Date.now() + CACHE_TTL }));
  } catch {
    // localStorage full or unavailable - ignore
  }
}

// ===== Note Cart (Ghi chú đơn hàng nhanh) =====
const NOTE_CART_KEY = 'menu_note_cart';
const NOTE_CART_TTL = 24 * 60 * 60 * 1000; // 24h

interface NoteCartItem {
  productId: string;
  productName: string;
  sizeName?: string;
  sizeId?: string;
  quantity: number;
}

function getNoteCart(): NoteCartItem[] {
  try {
    const raw = localStorage.getItem(NOTE_CART_KEY);
    if (!raw) return [];
    const { items, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) {
      localStorage.removeItem(NOTE_CART_KEY);
      return [];
    }
    return items || [];
  } catch {
    return [];
  }
}

function saveNoteCart(items: NoteCartItem[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(NOTE_CART_KEY);
    } else {
      localStorage.setItem(NOTE_CART_KEY, JSON.stringify({ items, expiry: Date.now() + NOTE_CART_TTL }));
    }
  } catch { /* ignore */ }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:2316';

const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

const dayLabels: Record<string, string> = {
  monday: 'Thứ Hai', tuesday: 'Thứ Ba', wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm', friday: 'Thứ Sáu', saturday: 'Thứ Bảy', sunday: 'Chủ Nhật',
};
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function MenuContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showScrollHeader, setShowScrollHeader] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandImgIdx, setExpandImgIdx] = useState(0);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalImgIdx, setModalImgIdx] = useState(0);
  const [modalSize, setModalSize] = useState<string | null>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const [noteCart, setNoteCart] = useState<NoteCartItem[]>([]);
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [noteCopied, setNoteCopied] = useState(false);
  const [noteAddedAnim, setNoteAddedAnim] = useState<string | null>(null); // productId for animation
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const featuredRef = useRef<HTMLDivElement>(null);

  // Load note cart from localStorage on mount
  useEffect(() => { setNoteCart(getNoteCart()); }, []);

  const addToNote = (productName: string, productId: string, sizeName?: string, sizeId?: string) => {
    setNoteCart((prev) => {
      const key = `${productId}-${sizeId || 'default'}`;
      const existing = prev.find((item) => `${item.productId}-${item.sizeId || 'default'}` === key);
      let updated: NoteCartItem[];
      if (existing) {
        updated = prev.map((item) =>
          `${item.productId}-${item.sizeId || 'default'}` === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updated = [...prev, { productId, productName, sizeName, sizeId, quantity: 1 }];
      }
      saveNoteCart(updated);
      return updated;
    });
    setNoteAddedAnim(productId);
    setTimeout(() => setNoteAddedAnim(null), 1200);
  };

  const updateNoteQty = (index: number, delta: number) => {
    setNoteCart((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }).filter((item) => item.quantity > 0);
      saveNoteCart(updated);
      return updated;
    });
  };

  const removeNoteItem = (index: number) => {
    setNoteCart((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      saveNoteCart(updated);
      return updated;
    });
  };

  const clearNoteCart = () => {
    setNoteCart([]);
    saveNoteCart([]);
  };

  const copyNoteToClipboard = () => {
    if (noteCart.length === 0) return;
    const lines = noteCart.map((item) => {
      const size = item.sizeName ? ` (${item.sizeName})` : '';
      return `- ${item.quantity}x ${item.productName}${size}`;
    });
    const text = `Em mu\u1ed1n \u0111\u1eb7t:\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).then(() => {
      setNoteCopied(true);
      setTimeout(() => setNoteCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setNoteCopied(true);
      setTimeout(() => setNoteCopied(false), 2000);
    });
  };

  const noteCount = noteCart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => { loadPublicData(); }, []);

  // Floating header + Parallax on scroll
  useEffect(() => {
    const onScroll = () => {
      setShowScrollHeader(window.scrollY > 300);
      setParallaxY(window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Card reveal animation via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );
    document.querySelectorAll('.reveal-card').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Auto-detect active section via IntersectionObserver
  useEffect(() => {
    if (categories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-cat-id'));
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [categories]);

  const loadPublicData = async () => {
    try {
      // Preview mode: always fetch fresh, no cache
      if (isPreview) {
        const [settingsRes, menuRes] = await Promise.all([
          storeSettingsApi.get(),
          categoriesApi.getPublicMenu(),
        ]);
        const s = settingsRes.data?.data || settingsRes.data;
        setSettings(s);
        const cats = menuRes.data?.list || menuRes.data?.data || menuRes.data || [];
        setCategories(cats);
        setLoading(false);
        return;
      }

      // Always fetch from API to check if menu is still public
      const [settingsRes, menuRes] = await Promise.all([
        storeSettingsApi.getPublic(),
        categoriesApi.getPublicMenu(),
      ]);
      const s = settingsRes.data?.data;
      if (!s || !s.isMenuPublic) {
        // Menu đã tắt → xóa cache cũ và hiện 404
        localStorage.removeItem(CACHE_KEY_SETTINGS);
        localStorage.removeItem(CACHE_KEY_MENU);
        setSettings(null);
        setLoading(false);
        return;
      }
      const cats = menuRes.data?.list || menuRes.data?.data || menuRes.data || [];

      // Save to cache (TTL 1 hour)
      setCachedData(CACHE_KEY_SETTINGS, s);
      setCachedData(CACHE_KEY_MENU, cats);

      setSettings(s);
      setCategories(cats);
    } catch { setSettings(null); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#fff' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e6 50%, #e8dcc8 100%)',
        padding: 24, textAlign: 'center', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        {/* Bánh animated */}
        <div style={{
          fontSize: 80, marginBottom: 16,
          animation: 'float404 3s ease-in-out infinite',
        }}>
          🎂
        </div>

        {/* 404 */}
        <div style={{
          fontSize: 100, fontWeight: 900, color: '#8B6914',
          lineHeight: 1, letterSpacing: -4,
          textShadow: '0 4px 20px rgba(139,105,20,0.15)',
        }}>
          404
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: '#333',
          margin: '12px 0 8px', letterSpacing: -0.5,
        }}>
          Menu chưa sẵn sàng
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 16, color: '#888', maxWidth: 400,
          margin: '0 0 32px', lineHeight: 1.6,
        }}>
          Menu hiện chưa được công khai. Vui lòng quay lại sau hoặc liên hệ cửa hàng để biết thêm chi tiết.
        </p>

        {/* Decorative divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, color: '#ccc',
        }}>
          <div style={{ width: 40, height: 1, background: '#d9d0c0' }} />
          <span style={{ fontSize: 20 }}>🍰</span>
          <div style={{ width: 40, height: 1, background: '#d9d0c0' }} />
        </div>

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 32px', fontSize: 15, fontWeight: 600,
            color: '#fff', background: '#8B6914', border: 'none',
            borderRadius: 50, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(139,105,20,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(139,105,20,0.4)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,105,20,0.3)'; }}
        >
          ← Quay lại
        </button>

        {/* Footer */}
        <p style={{ marginTop: 48, fontSize: 13, color: '#bbb' }}>
          Double S Bakery
        </p>

        <style>{`
          @keyframes float404 {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-12px) rotate(-3deg); }
            75% { transform: translateY(-6px) rotate(3deg); }
          }
        `}</style>
      </div>
    );
  }

  const pc = settings.primaryColor || '#8B6914';
  const now = new Date();
  const currentDayKey = dayKeys[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const todayHours = settings.openingHours?.[currentDayKey as keyof typeof settings.openingHours];
  const isOpen = todayHours && !todayHours.closed;

  // Featured products (across all categories)
  const allProducts = categories.flatMap((c) => c.products || []);
  const uniqueProducts = Array.from(new Map(allProducts.map((p) => [p.id, p])).values());
  const featuredProducts = uniqueProducts.filter((p: any) => p.isFeatured);

  // "Món mới" = danh mục đầu tiên có tên chứa "mới" hoặc "new" (case-insensitive)
  const newCategory = categories.find((c) =>
    c.name.toLowerCase().includes('mới') || c.name.toLowerCase().includes('new')
  );
  const newProducts = newCategory?.products || [];
  // IDs của sản phẩm "mới" để đánh badge trên card
  const newProductIds = new Set(newProducts.map((p) => p.id));

  // Scroll to section
  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Modal images
  const getProductImages = (p: Product): string[] => {
    const imgs: string[] = [];
    if (p.imageUrl) imgs.push(getImageUrl(p.imageUrl));
    if ((p as any).images?.length) {
      (p as any).images.forEach((img: string) => {
        const url = getImageUrl(img);
        if (!imgs.includes(url)) imgs.push(url);
      });
    }
    return imgs;
  };

  const toggleProductExpand = (p: Product) => {
    if (expandedProductId === p.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(p.id);
      setSelectedSize(null);
      setExpandImgIdx(0);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F3', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ============ PREVIEW BAR ============ */}
      {isPreview && (
        <div style={{
          background: 'linear-gradient(90deg, #ff9800, #ff5722)', padding: '10px 20px',
          textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 13,
          position: 'sticky', top: 0, zIndex: 200,
          boxShadow: '0 2px 8px rgba(255,87,34,0.3)',
        }}>
          Chế độ xem trước — Khách hàng sẽ thấy trang này khi menu được công khai
          <button onClick={() => window.close()} style={{
            marginLeft: 16, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff', padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
          }}>
            <ArrowLeftOutlined /> Đóng
          </button>
        </div>
      )}

      {/* ============ 1. FLOATING HEADER (on scroll) ============ */}
      <div style={{
        position: 'fixed', top: isPreview ? 41 : 0, left: 0, right: 0, zIndex: 100,
        background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transform: showScrollHeader ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {settings.logoUrl && (
            <img src={getImageUrl(settings.logoUrl)} alt="Logo"
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <span style={{ fontSize: 16, fontWeight: 700, color: pc }}>{settings.businessName}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {settings.phone && (
            <a href={`tel:${settings.phone}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: pc, color: '#fff', padding: '6px 16px', borderRadius: 20,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              <PhoneOutlined /> Gọi ngay
            </a>
          )}
        </div>
      </div>

      {/* ============ HERO SECTION (Parallax) ============ */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 420 }}>
        {settings.bannerUrls?.length > 0 ? (
          <div style={{ position: 'absolute', inset: 0, width: '100%', height: '120%', top: -parallaxY * 0.3 }}>
            <img src={getImageUrl(settings.bannerUrls[0])} alt="Banner"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)',
            }} />
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, width: '100%', height: '120%', top: -parallaxY * 0.3, background: `linear-gradient(135deg, ${pc}, ${pc}cc, ${pc}88)` }} />
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '50px 24px 36px', textAlign: 'center' }}>
          {settings.logoUrl && (
            <div className="hero-logo" style={{
              width: 130, height: 130, borderRadius: '50%', overflow: 'hidden',
              border: '5px solid #fff', margin: '0 auto 16px',
              boxShadow: '0 6px 30px rgba(0,0,0,0.35)', background: '#fff',
            }}>
              <img src={getImageUrl(settings.logoUrl)} alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <h1 style={{
            margin: 0, fontSize: 38, fontWeight: 800, letterSpacing: -0.5,
            filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.4))',
            display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {(settings.businessName || '').split('').map((char, i) => (
              <span key={i} className="wave-char" style={{
                display: 'inline-block',
                color: '#fff',
                animationDelay: `${i * 0.08}s`,
                whiteSpace: char === ' ' ? 'pre' : 'normal',
              }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h1>
          {settings.slogan && (
            <p style={{ margin: '8px 0 0', fontSize: 17, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 8px rgba(0,0,0,0.3)', fontWeight: 300, letterSpacing: 0.5 }}>
              {settings.slogan}
            </p>
          )}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {todayHours && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: isOpen ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                color: '#fff', padding: '7px 18px', borderRadius: 24, fontSize: 13, fontWeight: 600,
              }}>
                <ClockCircleOutlined />
                {isOpen ? `${todayHours.open} – ${todayHours.close}` : 'Hôm nay nghỉ'}
              </span>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                color: '#fff', padding: '7px 18px', borderRadius: 24,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                <PhoneOutlined /> {settings.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ============ NOTICE ============ */}
      {settings.specialNotice && (
        <div style={{ maxWidth: 900, margin: '-20px auto 20px', padding: '0 16px', position: 'relative', zIndex: 10 }}>
          <div style={{
            padding: '14px 24px', background: '#fff', borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${pc}`,
            fontSize: 14, color: '#5a4a2a', lineHeight: 1.6,
          }}>
            {settings.specialNotice}
          </div>
        </div>
      )}

      {/* ============ MÓN MỚI CAROUSEL ============ */}
      {newProducts.length > 0 && (
        <NewProductsCarousel
          products={newProducts}
          categoryName={newCategory?.name || 'Món mới'}
          categoryDesc={newCategory?.description}
          color={pc}
          showPrices={settings.showPrices}
          onSelect={(p) => { setModalProduct(p); setModalImgIdx(0); setModalSize(null); }}
        />
      )}

      {/* ============ 2. FEATURED PRODUCTS (carousel) ============ */}
      {featuredProducts.length > 0 && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <StarFilled style={{ color: '#faad14', fontSize: 20 }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>Được yêu thích</h2>
          </div>
          <div ref={featuredRef} style={{
            display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12,
            scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            {featuredProducts.map((product) => (
              <FeaturedCard key={product.id} product={product} color={pc}
                showPrices={settings.showPrices} onSelect={() => toggleProductExpand(product)} />
            ))}
          </div>
        </div>
      )}

      {/* ============ 4. CATEGORY NAV (scroll to section) ============ */}
      {categories.length > 0 && (
        <div style={{
          position: 'sticky', top: showScrollHeader ? (isPreview ? 97 : 56) : (isPreview ? 41 : 0),
          zIndex: 50, background: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '10px 16px',
          transition: 'top 0.3s',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{
            maxWidth: 900, margin: '0 auto', display: 'flex', gap: 8,
            overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            {categories.map((cat) => {
              const isActive = activeSection === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={(e) => {
                    setActiveSection(cat.id);
                    scrollToSection(cat.id);
                    // Ripple animation
                    const btn = e.currentTarget;
                    btn.style.transform = 'scale(0.92)';
                    setTimeout(() => { btn.style.transform = 'scale(1)'; }, 150);
                  }}
                  style={{
                    padding: '8px 20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    color: isActive ? '#fff' : '#555',
                    background: isActive ? pc : '#f5f5f5',
                    borderRadius: 24,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? `0 3px 12px ${pc}44` : 'none',
                    letterSpacing: isActive ? 0.3 : 0,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${pc}18`;
                      e.currentTarget.style.color = pc;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.color = '#555';
                    }
                  }}
                >
                  {cat.name}
                  {(cat.name.toLowerCase().includes('mới') || cat.name.toLowerCase().includes('new')) && (
                    <span className="new-dot" style={{
                      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                      background: '#ff4757', marginLeft: 5, verticalAlign: 'top',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ 3. PRODUCTS BY SECTION (responsive) ============ */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '12px 16px 60px' }}>
        {categories.map((cat) => {
          const prods = cat.products || [];
          return (
            <div key={cat.id} data-cat-id={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el; }}
              style={{ scrollMarginTop: showScrollHeader ? 120 : 60, marginBottom: 40 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingTop: 8 }}>
                <div style={{ width: 4, height: 28, background: pc, borderRadius: 2 }} />
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{cat.name}</h2>
                {cat.description && (
                  <span style={{ fontSize: 13, color: '#999', marginLeft: 4 }}>— {cat.description}</span>
                )}
                {prods.length > 4 && (
                  <span style={{ fontSize: 12, color: '#bbb', marginLeft: 'auto' }}>{prods.length} món</span>
                )}
              </div>

              {prods.length === 0 ? (
                <p style={{ color: '#ccc', fontSize: 14, paddingLeft: 16 }}>Chưa có sản phẩm</p>
              ) : (
                <>
                  {/* Desktop: Grid | Mobile: Horizontal scroll */}
                  {/* Grid for desktop */}
                  <div className="desktop-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 20,
                  }}>
                    {prods.map((product, idx) => (
                      <GridCard key={product.id} product={product} showPrices={settings.showPrices}
                        showDescription={settings.showDescription} color={pc}
                        onSelect={() => toggleProductExpand(product)}
                        staggerIndex={idx}
                        isNew={newProductIds.has(product.id)}
                        isExpanded={expandedProductId === product.id}
                        anyExpanded={!!expandedProductId}
                        settings={settings}
                        getProductImages={getProductImages}
                        expandImgIdx={expandImgIdx}
                        setExpandImgIdx={setExpandImgIdx}
                        selectedSize={selectedSize}
                        setSelectedSize={setSelectedSize}
                        onAddNote={addToNote}
                        noteAddedAnim={noteAddedAnim}
                      />
                    ))}
                  </div>
                  {/* Horizontal scroll for mobile */}
                  <div className="mobile-scroll" style={{
                    display: 'none', gap: 10, overflowX: expandedProductId ? undefined : 'auto',
                    flexWrap: expandedProductId ? 'wrap' : undefined,
                    scrollSnapType: expandedProductId ? undefined : 'x mandatory', paddingBottom: 8,
                    scrollbarWidth: 'none', msOverflowStyle: 'none',
                  }}>
                    {prods.map((product) => {
                      const imgSrc = product.imageUrl ? getImageUrl(product.imageUrl) : null;
                      const activeSizes = product.sizes?.filter((s) => s.isActive) || [];
                      const minP = activeSizes.length ? Math.min(...activeSizes.map((s) => s.price)) : product.price;
                      const isMobileExpanded = expandedProductId === product.id;
                      return (
                        <div key={product.id} onClick={() => toggleProductExpand(product)} style={{
                          minWidth: isMobileExpanded ? '100%' : '44%',
                          maxWidth: isMobileExpanded ? '100%' : '44%',
                          flexShrink: 0, scrollSnapAlign: 'start',
                          borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                          background: '#fff', boxShadow: isMobileExpanded ? `0 4px 20px ${pc}22` : '0 2px 8px rgba(0,0,0,0.06)',
                          border: isMobileExpanded ? `2px solid ${pc}44` : '2px solid transparent',
                          transition: 'all 0.3s ease',
                        }}>
                          <div style={{ height: 130, overflow: 'hidden', position: 'relative' }}>
                            {imgSrc ? (
                              <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: `${pc}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🍰</div>
                            )}
                            {newProductIds.has(product.id) && (
                              <span style={{
                                position: 'absolute', top: 6, left: 6,
                                background: 'linear-gradient(135deg, #ff4757, #ff6b81)', color: '#fff',
                                padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                              }}>MỚI</span>
                            )}
                            {settings.showPrices && (
                              <span style={{
                                position: 'absolute', bottom: 6, right: 6,
                                background: pc, color: '#fff', padding: '2px 8px',
                                borderRadius: 10, fontSize: 11, fontWeight: 700,
                              }}>
                                {activeSizes.length ? `${formatCurrency(minP)}` : formatCurrency(product.price)}
                              </span>
                            )}
                          </div>
                          <div style={{ padding: '8px 10px' }}>
                            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#333',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {product.name}
                            </h4>
                          </div>

                          {/* Mobile expanded detail */}
                          {isMobileExpanded && (() => {
                            const images = getProductImages(product);
                            return (
                              <div style={{
                                borderTop: `2px solid ${pc}22`,
                                padding: '12px',
                                background: '#faf8f5',
                                animation: 'expandDown 0.3s ease',
                              }}>
                                {images.length > 1 && (
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
                                    {images.map((img, i) => (
                                      <img key={i} src={img} alt={`${product.name} ${i + 1}`}
                                        onClick={(e) => { e.stopPropagation(); setExpandImgIdx(i); }}
                                        style={{
                                          width: 50, height: 50, borderRadius: 8, objectFit: 'cover', cursor: 'pointer',
                                          border: expandImgIdx === i ? `2px solid ${pc}` : '2px solid transparent',
                                          opacity: expandImgIdx === i ? 1 : 0.6,
                                          transition: 'all 0.2s', flexShrink: 0,
                                        }} />
                                    ))}
                                  </div>
                                )}
                                {product.description && (
                                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                                    {product.description}
                                  </p>
                                )}
                                {settings.showPrices && activeSizes.length > 0 && (
                                  <div style={{ marginBottom: 10 }}>
                                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>
                                      Chọn kích cỡ
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                      {activeSizes.map((size) => {
                                        const isSel = selectedSize === size.id;
                                        return (
                                          <div key={size.id} onClick={(e) => { e.stopPropagation(); setSelectedSize(isSel ? null : size.id); }} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                            background: isSel ? `${pc}11` : '#fff',
                                            border: isSel ? `2px solid ${pc}` : '1px solid #eee',
                                            transition: 'all 0.2s',
                                          }}>
                                            <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? pc : '#333', fontSize: 13 }}>
                                              {size.name}
                                            </span>
                                            <span style={{ fontWeight: 700, color: pc, fontSize: 14 }}>
                                              {formatCurrency(size.price)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {settings.showPrices && activeSizes.length === 0 && (
                                  <div style={{ marginBottom: 10 }}>
                                    <span style={{ fontSize: 20, fontWeight: 800, color: pc }}>{formatCurrency(product.price)}</span>
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const selSize = activeSizes.find((s) => s.id === selectedSize);
                                    if (activeSizes.length > 0 && !selSize) {
                                      const first = activeSizes[0];
                                      addToNote(product.name, product.id, first.name, first.id);
                                    } else {
                                      addToNote(product.name, product.id, selSize?.name, selSize?.id);
                                    }
                                  }}
                                  style={{
                                    width: '100%', padding: '9px', marginBottom: 8,
                                    background: noteAddedAnim === product.id ? '#52c41a' : `${pc}11`,
                                    color: noteAddedAnim === product.id ? '#fff' : pc,
                                    border: noteAddedAnim === product.id ? '2px solid #52c41a' : `2px solid ${pc}44`,
                                    borderRadius: 8, cursor: 'pointer',
                                    fontSize: 12, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    transition: 'all 0.3s',
                                  }}
                                >
                                  {noteAddedAnim === product.id
                                    ? <><CheckOutlined /> Đã thêm!</>
                                    : <><ShoppingCartOutlined /> Thêm vào ghi chú</>
                                  }
                                </button>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  {settings?.phone && (
                                    <a href={`tel:${settings.phone}`} onClick={(e) => e.stopPropagation()} style={{
                                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                      padding: '9px', background: pc, color: '#fff', borderRadius: 8,
                                      fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                    }}>
                                      <PhoneOutlined /> Gọi đặt
                                    </a>
                                  )}
                                  {settings?.zalo && (
                                    <a href={`https://zalo.me/${settings.zalo}`} target="_blank" rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()} style={{
                                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                      padding: '9px', background: '#fff', color: pc, border: `2px solid ${pc}`, borderRadius: 8,
                                      fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                    }}>
                                      Zalo
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail is now inline in GridCard */}

      {/* ============ PRODUCT DETAIL MODAL (for Món mới carousel) ============ */}
      {modalProduct && (() => {
        const images = getProductImages(modalProduct);
        const activeSizes = modalProduct.sizes?.filter((s) => s.isActive) || [];
        return (
          <div onClick={() => setModalProduct(null)} style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, animation: 'fadeIn 0.2s ease',
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: '#fff', borderRadius: 20, overflow: 'hidden',
              width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'expandDown 0.3s ease',
            }}>
              {/* Close button */}
              <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'flex-end', padding: '10px 12px 0' }}>
                <div onClick={() => setModalProduct(null)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: '#fff', fontSize: 14,
                }}>
                  <CloseOutlined />
                </div>
              </div>

              {/* Main image */}
              {images.length > 0 && (
                <div style={{ width: '100%', height: 260, overflow: 'hidden', marginTop: -42 }}>
                  <img src={images[modalImgIdx] || images[0]} alt={modalProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Image gallery thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {images.map((img, i) => (
                    <img key={i} src={img} alt={`${modalProduct.name} ${i + 1}`}
                      onClick={() => setModalImgIdx(i)}
                      style={{
                        width: 56, height: 56, borderRadius: 10, objectFit: 'cover', cursor: 'pointer',
                        border: modalImgIdx === i ? `2px solid ${pc}` : '2px solid transparent',
                        opacity: modalImgIdx === i ? 1 : 0.5,
                        transition: 'all 0.2s', flexShrink: 0,
                      }} />
                  ))}
                </div>
              )}

              {/* Content */}
              <div style={{ padding: '16px 20px 20px' }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{modalProduct.name}</h3>

                {modalProduct.description && (
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                    {modalProduct.description}
                  </p>
                )}

                {/* Size selector */}
                {settings.showPrices && activeSizes.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>
                      Chọn kích cỡ
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activeSizes.map((size) => {
                        const isSel = modalSize === size.id;
                        return (
                          <div key={size.id} onClick={() => setModalSize(isSel ? null : size.id)} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                            background: isSel ? `${pc}11` : '#fff',
                            border: isSel ? `2px solid ${pc}` : '1px solid #eee',
                            transition: 'all 0.2s',
                          }}>
                            <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? pc : '#333', fontSize: 14 }}>
                              {size.name}
                            </span>
                            <span style={{ fontWeight: 700, color: pc, fontSize: 15 }}>
                              {formatCurrency(size.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Price (no sizes) */}
                {settings.showPrices && activeSizes.length === 0 && (
                  <div style={{ marginTop: 16 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: pc }}>{formatCurrency(modalProduct.price)}</span>
                  </div>
                )}

                {/* Add to note button */}
                <button
                  onClick={() => {
                    const selSize = activeSizes.find((s) => s.id === modalSize);
                    if (activeSizes.length > 0 && !selSize) {
                      const first = activeSizes[0];
                      addToNote(modalProduct.name, modalProduct.id, first.name, first.id);
                    } else {
                      addToNote(modalProduct.name, modalProduct.id, selSize?.name, selSize?.id);
                    }
                  }}
                  style={{
                    width: '100%', padding: '12px', marginTop: 16,
                    background: noteAddedAnim === modalProduct.id ? '#52c41a' : `${pc}11`,
                    color: noteAddedAnim === modalProduct.id ? '#fff' : pc,
                    border: noteAddedAnim === modalProduct.id ? '2px solid #52c41a' : `2px solid ${pc}44`,
                    borderRadius: 12, cursor: 'pointer',
                    fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.3s',
                  }}
                >
                  {noteAddedAnim === modalProduct.id
                    ? <><CheckOutlined /> Đã thêm!</>
                    : <><ShoppingCartOutlined /> Thêm vào ghi chú</>
                  }
                </button>

                {/* CTA buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {settings?.phone && (
                    <a href={`tel:${settings.phone}`} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '12px', background: pc, color: '#fff', borderRadius: 12,
                      fontSize: 14, fontWeight: 700, textDecoration: 'none',
                    }}>
                      <PhoneOutlined /> Gọi đặt
                    </a>
                  )}
                  {settings?.zalo && (
                    <a href={`https://zalo.me/${settings.zalo}`} target="_blank" rel="noopener noreferrer" style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '12px', background: '#fff', color: pc, border: `2px solid ${pc}`, borderRadius: 12,
                      fontSize: 14, fontWeight: 700, textDecoration: 'none',
                    }}>
                      Zalo
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ NOTE CART DRAWER ============ */}
      {noteDrawerOpen && (
        <div onClick={() => setNoteDrawerOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 250,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'fixed', bottom: 0, right: 0, left: 0,
            maxWidth: 440, margin: '0 auto',
            background: '#fff', borderRadius: '20px 20px 0 0',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.2)',
            maxHeight: '75vh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px 12px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCartOutlined style={{ fontSize: 18, color: pc }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Ghi chú đặt hàng</span>
                {noteCart.length > 0 && (
                  <span style={{
                    background: pc, color: '#fff', padding: '1px 8px',
                    borderRadius: 12, fontSize: 12, fontWeight: 700,
                  }}>{noteCount}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {noteCart.length > 0 && (
                  <button onClick={clearNoteCart} style={{
                    background: 'none', border: 'none', color: '#ff4d4f',
                    fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: '4px 8px',
                  }}>
                    Xóa tất cả
                  </button>
                )}
                <div onClick={() => setNoteDrawerOpen(false)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#f5f5f5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  fontSize: 12, color: '#999',
                }}>
                  <CloseOutlined />
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {noteCart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#ccc' }}>
                  <ShoppingCartOutlined style={{ fontSize: 36, marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>Chưa có món nào</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>Chọn món từ menu rồi bấm "Thêm vào ghi chú"</p>
                </div>
              ) : (
                noteCart.map((item, idx) => (
                  <div key={`${item.productId}-${item.sizeId || 'default'}-${idx}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', borderBottom: idx < noteCart.length - 1 ? '1px solid #f5f5f5' : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{item.productName}</div>
                      {item.sizeName && (
                        <span style={{ fontSize: 12, color: '#999' }}>{item.sizeName}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => updateNoteQty(idx, -1)} style={{
                        width: 28, height: 28, borderRadius: '50%', border: '1px solid #ddd',
                        background: '#fff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#666',
                      }}>
                        <MinusOutlined />
                      </button>
                      <span style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</span>
                      <button onClick={() => updateNoteQty(idx, 1)} style={{
                        width: 28, height: 28, borderRadius: '50%', border: '1px solid #ddd',
                        background: '#fff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#666',
                      }}>
                        <PlusOutlined />
                      </button>
                    </div>
                    <button onClick={() => removeNoteItem(idx)} style={{
                      background: 'none', border: 'none', color: '#ff4d4f',
                      cursor: 'pointer', fontSize: 14, padding: '4px',
                    }}>
                      <DeleteOutlined />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer: Copy + CTA */}
            {noteCart.length > 0 && (
              <div style={{
                padding: '12px 20px 20px', borderTop: '1px solid #f0f0f0',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Preview text */}
                <div style={{
                  background: '#f9f7f4', borderRadius: 10, padding: '10px 14px',
                  fontSize: 12, color: '#666', lineHeight: 1.6, maxHeight: 80, overflowY: 'auto',
                }}>
                  <span style={{ color: '#999' }}>Nội dung sẽ copy:</span><br />
                  Em muốn đặt:<br />
                  {noteCart.map((item, i) => (
                    <span key={i}>- {item.quantity}x {item.productName}{item.sizeName ? ` (${item.sizeName})` : ''}<br /></span>
                  ))}
                </div>

                <button onClick={copyNoteToClipboard} style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  background: noteCopied ? '#52c41a' : pc,
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.3s',
                }}>
                  {noteCopied
                    ? <><CheckOutlined /> Đã sao chép! Dán vào tin nhắn để đặt hàng</>
                    : <><CopyOutlined /> Sao chép ghi chú</>
                  }
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  {settings?.phone && (
                    <a href={`tel:${settings.phone}`} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px', background: '#fff', color: pc, border: `2px solid ${pc}`, borderRadius: 10,
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    }}>
                      <PhoneOutlined /> Gọi đặt
                    </a>
                  )}
                  {settings?.zalo && (
                    <a href={`https://zalo.me/${settings.zalo}`} target="_blank" rel="noopener noreferrer" style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px', background: '#fff', color: '#0068ff', border: '2px solid #0068ff', borderRadius: 10,
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    }}>
                      Zalo
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 5. FLOATING ACTION BUTTONS ============ */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {/* Contact FAB expanded options */}
        {fabOpen && (settings.phone || settings.zalo) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeIn 0.2s' }}>
            {settings.phone && (
              <a href={`tel:${settings.phone}`} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', color: '#333', padding: '10px 18px', borderRadius: 28,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)', textDecoration: 'none',
                fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                <PhoneOutlined style={{ color: pc }} /> Gọi {settings.phone}
              </a>
            )}
            {settings.zalo && (
              <a href={`https://zalo.me/${settings.zalo}`} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', color: '#333', padding: '10px 18px', borderRadius: 28,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)', textDecoration: 'none',
                fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                <span style={{ color: '#0068ff', fontWeight: 700 }}>Zalo</span> Nhắn tin
              </a>
            )}
            {settings.googleMapsUrl && (
              <a href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', color: '#333', padding: '10px 18px', borderRadius: 28,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)', textDecoration: 'none',
                fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                <EnvironmentOutlined style={{ color: '#ea4335' }} /> Xem bản đồ
              </a>
            )}
          </div>
        )}

        {/* FAB buttons row — dùng div thay button để tránh Tailwind Preflight reset */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Note cart FAB */}
          <div role="button" tabIndex={0} onClick={() => { setNoteDrawerOpen(true); setFabOpen(false); }} style={{
            width: 50, height: 50, borderRadius: '50%', border: `2px solid ${pc}44`,
            background: '#fff', color: pc, fontSize: 20, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <ShoppingCartOutlined />
            {noteCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ff4757', color: '#fff',
                minWidth: 20, height: 20, borderRadius: 10,
                padding: '0 4px',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff',
              }}>{noteCount > 9 ? '9+' : noteCount}</span>
            )}
          </div>

          {/* Phone/Contact FAB */}
          {(settings.phone || settings.zalo) && (
            <div role="button" tabIndex={0} onClick={() => setFabOpen(!fabOpen)} style={{
              width: 56, height: 56, borderRadius: '50%', border: 'none',
              background: pc, color: '#fff', fontSize: 22, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.3s',
              transform: fabOpen ? 'rotate(45deg)' : 'rotate(0)',
              animation: fabOpen ? 'none' : 'pulse 2s infinite',
            }}>
              {fabOpen ? <CloseOutlined /> : <PhoneOutlined />}
            </div>
          )}
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: '#1a1a1a', color: '#fff', padding: '50px 24px 30px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {settings.description && (
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Về {settings.businessName}</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, maxWidth: 600, margin: '0 auto' }}>
                {settings.description}
              </p>
            </div>
          )}

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 36, paddingTop: settings.description ? 32 : 0,
            borderTop: settings.description ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}>
            {/* Contact */}
            <div>
              <h4 style={{ color: pc, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Liên hệ</h4>
              {settings.phone && <FooterLink icon={<PhoneOutlined />} href={`tel:${settings.phone}`} text={settings.phone} />}
              {settings.zalo && <FooterLink icon={<PhoneOutlined />} text={`Zalo: ${settings.zalo}`} />}
              {settings.email && <FooterLink icon={<MailOutlined />} href={`mailto:${settings.email}`} text={settings.email} />}
              {settings.address && <FooterLink icon={<EnvironmentOutlined />} href={settings.googleMapsUrl || undefined} text={settings.address} target="_blank" />}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {settings.facebookUrl && <SocialBtn href={settings.facebookUrl} icon={<FacebookOutlined />} color={pc} />}
                {settings.instagramUrl && <SocialBtn href={settings.instagramUrl} icon={<InstagramOutlined />} color={pc} />}
                {settings.tiktokUrl && <SocialBtn href={settings.tiktokUrl} icon={<LinkOutlined />} color={pc} />}
              </div>
            </div>

            {/* Hours */}
            {settings.openingHours && (
              <div>
                <h4 style={{ color: pc, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Giờ mở cửa</h4>
                {dayKeys.map((day) => {
                  const h = settings.openingHours?.[day as keyof typeof settings.openingHours];
                  const today = day === currentDayKey;
                  return (
                    <div key={day} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderRadius: 6, fontSize: 13,
                      background: today ? 'rgba(255,255,255,0.08)' : 'transparent',
                      fontWeight: today ? 700 : 400, color: today ? '#fff' : 'rgba(255,255,255,0.6)',
                    }}>
                      <span>{dayLabels[day]}</span>
                      <span style={{ color: h?.closed ? '#ff6b6b' : (today ? '#52c41a' : 'rgba(255,255,255,0.6)') }}>
                        {h?.closed ? 'Nghỉ' : `${h?.open} – ${h?.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7. Google Maps embed */}
            {settings.googleMapsUrl && (
              <div>
                <h4 style={{ color: pc, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Vị trí</h4>
                {settings.address && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 12px' }}>{settings.address}</p>}
                <a href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontSize: 13,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  <EnvironmentOutlined /> Mở Google Maps
                </a>
              </div>
            )}
          </div>

          <div style={{
            textAlign: 'center', marginTop: 48, paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)', fontSize: 12,
          }}>
            © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes expandDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.25); } 50% { box-shadow: 0 4px 20px rgba(0,0,0,0.25), 0 0 0 10px ${pc}22; } }
        @keyframes waveBounce {
          0%, 20% { transform: translateY(0); color: #fff; }
          10% { transform: translateY(-8px); color: ${pc}; }
        }
        @keyframes waveHold {
          0%, 100% { color: #fff; }
          30%, 70% { color: ${pc}; }
        }
        .wave-char {
          animation: waveBounce 4s ease-in-out infinite, waveHold 4s ease-in-out infinite;
        }
        @keyframes logoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .hero-logo { animation: logoFloat 3s ease-in-out infinite; }
        @keyframes newPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.05); } }
        @keyframes dotBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .new-badge-pulse { animation: newPulse 2s ease-in-out infinite; }
        .new-dot { animation: dotBlink 1.5s ease-in-out infinite; }
        .new-spotlight-card { transition: transform 0.3s, box-shadow 0.3s; }
        .new-spotlight-card:hover { transform: scale(1.02); box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
        *::-webkit-scrollbar { display: none; }

        /* Desktop: grid layout */
        @media (min-width: 769px) {
          .mobile-scroll { display: none !important; }
          .desktop-grid { display: grid !important; }
        }

        /* Mobile: horizontal scroll */
        @media (max-width: 768px) {
          .mobile-scroll { display: flex !important; }
          .desktop-grid { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// =============================================
// FEATURED CARD (horizontal scroll)
// =============================================
function FeaturedCard({ product, color, showPrices, onSelect }: {
  product: Product; color: string; showPrices: boolean; onSelect: () => void;
}) {
  const imgSrc = product.imageUrl ? getImageUrl(product.imageUrl) : null;
  const minPrice = product.sizes?.length
    ? Math.min(...product.sizes.filter((s) => s.isActive).map((s) => s.price)) : product.price;

  return (
    <div onClick={onSelect} style={{
      minWidth: 260, maxWidth: 260, borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
      background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      scrollSnapAlign: 'start', transition: 'transform 0.2s', flexShrink: 0,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `${color}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🍰</div>
        )}
        <div style={{
          position: 'absolute', top: 10, left: 10, background: '#faad14',
          color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <StarFilled style={{ fontSize: 10 }} /> Yêu thích
        </div>
        {showPrices && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10, background: color, color: '#fff',
            padding: '4px 12px', borderRadius: 16, fontSize: 13, fontWeight: 700,
          }}>
            {product.sizes?.length ? `Từ ${formatCurrency(minPrice)}` : formatCurrency(product.price)}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px 14px' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{product.name}</h3>
      </div>
    </div>
  );
}

// =============================================
// GRID CARD (with visible size prices)
// =============================================
function GridCard({ product, showPrices, showDescription, color, onSelect, staggerIndex = 0, isNew = false,
  isExpanded = false, anyExpanded = false, settings, getProductImages, expandImgIdx = 0, setExpandImgIdx, selectedSize, setSelectedSize,
  onAddNote, noteAddedAnim,
}: {
  product: Product; showPrices: boolean; showDescription: boolean; color: string; onSelect: () => void;
  staggerIndex?: number; isNew?: boolean; isExpanded?: boolean; anyExpanded?: boolean; settings?: any;
  getProductImages?: (p: Product) => string[]; expandImgIdx?: number; setExpandImgIdx?: (v: number | ((p: number) => number)) => void;
  selectedSize?: string | null; setSelectedSize?: (v: string | null) => void;
  onAddNote?: (productName: string, productId: string, sizeName?: string, sizeId?: string) => void;
  noteAddedAnim?: string | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imgSrc = product.imageUrl ? getImageUrl(product.imageUrl) : null;
  const activeSizes = product.sizes?.filter((s) => s.isActive) || [];
  const minPrice = activeSizes.length ? Math.min(...activeSizes.map((s) => s.price)) : product.price;

  // 3D Tilt effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -6;
    const rotateY = (x - centerX) / centerX * 6;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
  }, []);

  return (
    <div ref={cardRef} className="reveal-card" onClick={onSelect} style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
      boxShadow: isExpanded ? `0 4px 20px ${color}22` : '0 1px 8px rgba(0,0,0,0.06)',
      border: isExpanded ? `2px solid ${color}44` : '2px solid transparent',
      transition: 'transform 0.2s ease, box-shadow 0.25s ease, opacity 0.6s ease, border 0.2s',
      opacity: 0, transform: 'translateY(30px)',
      transitionDelay: `${staggerIndex * 0.08}s`,
      willChange: 'transform',
      alignSelf: anyExpanded ? 'start' : undefined,
    }}
      onMouseMove={isExpanded ? undefined : handleMouseMove}
      onMouseEnter={isExpanded ? undefined : (e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)'; }}
      onMouseLeave={isExpanded ? undefined : (e) => { handleMouseLeave(); e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)'; }}
    >
      {/* Image with hover overlay */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <div style={{ height: '100%', background: `linear-gradient(135deg, ${color}11, ${color}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>🍰</div>
        )}
        {/* NEW badge */}
        {isNew && (
          <div className="new-badge-pulse" style={{
            position: 'absolute', top: 10, left: 10,
            background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
            color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4, zIndex: 2,
          }}>
            ✨ MỚI
          </div>
        )}
        {/* Featured badge */}
        {!isNew && (product as any).isFeatured && (
          <div style={{
            position: 'absolute', top: 10, left: 10, background: '#faad14',
            color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <StarFilled style={{ fontSize: 10 }} /> Best
          </div>
        )}
        {/* Price badge */}
        {showPrices && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10, background: color, color: '#fff',
            padding: '5px 14px', borderRadius: 20, fontSize: 14, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {activeSizes.length ? `Từ ${formatCurrency(minPrice)}` : formatCurrency(product.price)}
          </div>
        )}
        {/* "Xem chi tiết" hover overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.3s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
        >
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '8px 20px', borderRadius: 24 }}>
            Xem chi tiết
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{product.name}</h3>
        {showDescription && product.description && !(anyExpanded && !isExpanded) && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#999', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.description}
          </p>
        )}
        {/* 3. Show size prices directly on card */}
        {!isExpanded && !anyExpanded && showPrices && activeSizes.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activeSizes.slice(0, 3).map((size) => (
              <div key={size.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: '#888', fontWeight: 500 }}>{size.name}</span>
                <span style={{ color: color, fontWeight: 700 }}>{formatCurrency(size.price)}</span>
              </div>
            ))}
            {activeSizes.length > 3 && (
              <span style={{ fontSize: 11, color: '#bbb', textAlign: 'right' }}>+{activeSizes.length - 3} size khác</span>
            )}
          </div>
        )}
      </div>

      {/* ===== INLINE EXPAND DETAIL ===== */}
      {isExpanded && (() => {
        const images = getProductImages ? getProductImages(product) : [];
        return (
          <div style={{
            borderTop: `2px solid ${color}22`,
            padding: '16px',
            background: '#faf8f5',
            animation: 'expandDown 0.3s ease',
          }}>
            {/* Image gallery (if multiple images) */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {images.map((img, i) => (
                  <img key={i} src={img} alt={`${product.name} ${i + 1}`}
                    onClick={(e) => { e.stopPropagation(); setExpandImgIdx?.(i); }}
                    style={{
                      width: 60, height: 60, borderRadius: 8, objectFit: 'cover', cursor: 'pointer',
                      border: expandImgIdx === i ? `2px solid ${color}` : '2px solid transparent',
                      opacity: expandImgIdx === i ? 1 : 0.6,
                      transition: 'all 0.2s', flexShrink: 0,
                    }} />
                ))}
              </div>
            )}

            {/* Full description */}
            {product.description && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                {product.description}
              </p>
            )}

            {/* Size selector */}
            {showPrices && activeSizes.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>
                  Chọn kích cỡ
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeSizes.map((size) => {
                    const isSel = selectedSize === size.id;
                    return (
                      <div key={size.id} onClick={(e) => { e.stopPropagation(); setSelectedSize?.(isSel ? null : size.id); }} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        background: isSel ? `${color}11` : '#fff',
                        border: isSel ? `2px solid ${color}` : '1px solid #eee',
                        transition: 'all 0.2s',
                      }}>
                        <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? color : '#333', fontSize: 14 }}>
                          {size.name}
                        </span>
                        <span style={{ fontWeight: 700, color, fontSize: 15 }}>
                          {formatCurrency(size.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price (no sizes) */}
            {showPrices && activeSizes.length === 0 && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color }}>{formatCurrency(product.price)}</span>
              </div>
            )}

            {/* Add to note button */}
            {onAddNote && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const selSize = activeSizes.find((s) => s.id === selectedSize);
                  if (activeSizes.length > 0 && !selSize) {
                    // Has sizes but none selected — auto-select first
                    const first = activeSizes[0];
                    onAddNote(product.name, product.id, first.name, first.id);
                  } else {
                    onAddNote(product.name, product.id, selSize?.name, selSize?.id);
                  }
                }}
                style={{
                  width: '100%', padding: '10px', marginBottom: 8,
                  background: noteAddedAnim === product.id ? '#52c41a' : `${color}11`,
                  color: noteAddedAnim === product.id ? '#fff' : color,
                  border: noteAddedAnim === product.id ? '2px solid #52c41a' : `2px solid ${color}44`,
                  borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.3s',
                }}
              >
                {noteAddedAnim === product.id
                  ? <><CheckOutlined /> Đã thêm!</>
                  : <><ShoppingCartOutlined /> Thêm vào ghi chú</>
                }
              </button>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {settings?.phone && (
                <a href={`tel:${settings.phone}`} onClick={(e) => e.stopPropagation()} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px', background: color, color: '#fff', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, textDecoration: 'none',
                }}>
                  <PhoneOutlined /> Gọi đặt
                </a>
              )}
              {settings?.zalo && (
                <a href={`https://zalo.me/${settings.zalo}`} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px', background: '#fff', color, border: `2px solid ${color}`, borderRadius: 10,
                  fontSize: 13, fontWeight: 700, textDecoration: 'none',
                }}>
                  Zalo
                </a>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// =============================================
// FOOTER HELPERS
// =============================================
function FooterLink({ icon, href, text, target }: { icon?: React.ReactNode; href?: string; text: string; target?: string }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
      {icon && <span style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{icon}</span>}
      <span>{text}</span>
    </div>
  );
  return href ? <a href={href} target={target} rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{content}</a> : content;
}

function SocialBtn({ href, icon, color }: { href: string; icon: React.ReactNode; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      width: 38, height: 38, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
      fontSize: 16, transition: 'all 0.2s', textDecoration: 'none',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
    >
      {icon}
    </a>
  );
}

// =============================================
// NEW PRODUCTS AUTO-SCROLL CAROUSEL (CSS animation, no duplicate)
// =============================================
function NewProductsCarousel({ products, categoryName, categoryDesc, color, showPrices, onSelect }: {
  products: Product[]; categoryName: string; categoryDesc?: string; color: string;
  showPrices: boolean; onSelect: (p: Product) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cardW = 280; // card width (larger)
  const gap = 12;
  const totalW = products.length * (cardW + gap);
  const duration = Math.max(products.length * 4, 8); // min 8s

  const getMinPrice = (p: Product) => {
    const activeSizes = p.sizes?.filter((s) => s.isActive) || [];
    return activeSizes.length ? Math.min(...activeSizes.map((s) => s.price)) : p.price;
  };

  return (
    <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '24px 0 12px' }}>
      {/* Main carousel content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span className="new-badge-pulse" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
            color: '#fff', padding: '5px 14px', borderRadius: 20,
            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
          }}>
            ✨ MỚI
          </span>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{categoryName}</h2>
          {categoryDesc && <span style={{ fontSize: 13, color: '#999' }}>— {categoryDesc}</span>}
        </div>

        {/* Carousel container */}
        <div
          style={{ overflow: 'hidden', borderRadius: 16, position: 'relative', padding: '8px 0' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => { setIsPaused(false); setHoveredId(null); }}
        >
          <div style={{
            display: 'flex', gap: `${gap}px`, width: 'max-content',
            animation: `newCarouselScroll ${duration}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}>
            {/* Render 3 sets for guaranteed seamless loop */}
            {[0, 1, 2].map((set) =>
              products.map((product, i) => {
                const imgSrc = product.imageUrl ? getImageUrl(product.imageUrl) : null;
                const uid = `${set}-${product.id}`;
                const isHovered = hoveredId === uid;
                const isDimmed = hoveredId !== null && !isHovered;
                return (
                  <div
                    key={uid}
                    onClick={() => onSelect(product)}
                    onMouseEnter={() => setHoveredId(uid)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      minWidth: cardW, width: cardW, flexShrink: 0,
                      borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                      background: '#fff', position: 'relative',
                      border: `2.5px solid ${color}88`,
                      boxShadow: isHovered ? `0 10px 35px ${color}33` : '0 2px 10px rgba(0,0,0,0.06)',
                      transform: isHovered ? 'scale(1.06)' : isDimmed ? 'scale(0.96)' : 'scale(1)',
                      opacity: isDimmed ? 0.45 : 1,
                      transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                      zIndex: isHovered ? 10 : 1,
                    }}
                  >
                    {/* Image */}
                    <div style={{ height: 240, overflow: 'hidden', position: 'relative' }}>
                      {imgSrc ? (
                        <img src={imgSrc} alt={product.name}
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                            transition: 'transform 0.4s',
                          }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: `${color}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🍰</div>
                      )}
                      {/* Badge */}
                      <span className="new-badge-pulse" style={{
                        position: 'absolute', top: 10, left: 10,
                        background: 'linear-gradient(135deg, #ff4757, #ff6b81)', color: '#fff',
                        padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      }}>✨ MỚI</span>
                      {/* Hover overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(180deg, transparent 25%, rgba(0,0,0,0.8) 100%)',
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.35s',
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                        padding: '16px',
                      }}>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{product.name}</h4>
                        {showPrices && (
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#ffd32a', marginTop: 4 }}>
                            {product.sizes?.length
                              ? `Từ ${formatCurrency(getMinPrice(product))}`
                              : formatCurrency(product.price)}
                          </span>
                        )}
                        {product.description && (
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {product.description}
                          </p>
                        )}
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Nhấn để xem chi tiết</span>
                      </div>
                    </div>
                    {/* Name + price below (visible when NOT hovered) */}
                    <div style={{
                      padding: '12px 14px',
                      opacity: isHovered ? 0 : 1,
                      maxHeight: isHovered ? 0 : 60,
                      overflow: 'hidden',
                      transition: 'all 0.3s',
                    }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.name}
                      </h4>
                      {showPrices && (
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{formatCurrency(getMinPrice(product))}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CSS for carousel scroll */}
      <style>{`
        @keyframes newCarouselScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${totalW}px); }
        }
      `}</style>
    </div>
  );
}

// =============================================
// EXPORT
// =============================================
export default function PublicMenuPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>
    }>
      <MenuContent />
    </Suspense>
  );
}
