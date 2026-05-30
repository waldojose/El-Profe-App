import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfileModal = ({ user, token, onClose, onUpdate }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    legal_name: user?.legal_name || "",
    artist_name: user?.artist_name || "",
    country: user?.country || "",
    pro_affiliation: user?.pro_affiliation || "",
    publisher: user?.publisher || "",
    role: user?.role || "",
    roles: user?.roles || [],
    music_styles: user?.music_styles || [],
    bio: user?.bio || "",
    photo_url: user?.photo_url || ""
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || "");
  const [loading, setLoading] = useState(false);
  const isRequired = !user?.profile_completed;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleToggle = (role) => {
    const roles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    setFormData({ ...formData, roles, role: roles[0] || "" }); // Keep first role as primary for backwards compatibility
  };

  const handleMusicStyleToggle = (style) => {
    const music_styles = formData.music_styles.includes(style)
      ? formData.music_styles.filter(s => s !== style)
      : [...formData.music_styles, style];
    setFormData({ ...formData, music_styles });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t("profile.toastPhotoTooLarge"));
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData({ ...formData, photo_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.legal_name || !formData.artist_name || !formData.country || !formData.pro_affiliation || formData.roles.length === 0) {
      toast.error(t("profile.toastRequiredFields"));
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API}/profile/complete`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdate(response.data);
    } catch (error) {
      toast.error(t("profile.toastUpdateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={isRequired ? undefined : onClose}>
      <DialogContent 
        className="bg-[#0A0A0A] border border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={isRequired ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isRequired ? (e) => e.preventDefault() : undefined}
        data-testid="profile-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-heading text-2xl">
            {isRequired ? t("profile.titleComplete") : t("profile.titleEdit")}
          </DialogTitle>
          {isRequired && (
            <DialogDescription className="text-gray-400">
              {t("profile.requiredDescription")}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Photo Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("profile.profilePhoto")}
            </Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-[#121212] rounded-full flex items-center justify-center overflow-hidden border border-white/10">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-gray-600">{formData.artist_name?.charAt(0) || "?"}</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                  data-testid="profile-photo-input"
                />
                <label
                  htmlFor="photo-upload"
                  className="btn-secondary text-sm cursor-pointer inline-block"
                >
                  {t("profile.choosePhoto")}
                </label>
                <p className="text-xs text-gray-400 mt-1">{t("profile.photoHint")}</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="legal_name" className="text-sm font-medium mb-2 block">
              {t("profile.legalName")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="legal_name"
              name="legal_name"
              value={formData.legal_name}
              onChange={handleChange}
              required
              className="bg-[#121212] border-white/10 text-white"
              placeholder={t("profile.legalNamePlaceholder")}
              data-testid="profile-legal-name-input"
            />
          </div>

          <div>
            <Label htmlFor="artist_name" className="text-sm font-medium mb-2 block">
              {t("profile.artistName")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="artist_name"
              name="artist_name"
              value={formData.artist_name}
              onChange={handleChange}
              required
              className="bg-[#121212] border-white/10 text-white"
              placeholder={t("profile.artistNamePlaceholder")}
              data-testid="profile-artist-name-input"
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-sm font-medium mb-2 block">
              {t("profile.country")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="bg-[#121212] border-white/10 text-white"
              placeholder={t("profile.countryPlaceholder")}
              data-testid="profile-country-input"
            />
          </div>

          <div>
            <Label htmlFor="pro_affiliation" className="text-sm font-medium mb-2 block">
              {t("profile.proAffiliation")} <span className="text-red-500">*</span>
            </Label>
            <select
              id="pro_affiliation"
              name="pro_affiliation"
              value={formData.pro_affiliation}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-md text-white focus:border-[#7c5cff] focus:outline-none"
              data-testid="profile-pro-select"
            >
              <option value="">{t("profile.selectPro")}</option>
              <option value="ASCAP">ASCAP</option>
              <option value="BMI">BMI</option>
              <option value="SESAC">SESAC</option>
              <option value="Other">{t("profile.proOther")}</option>
              <option value="None">{t("profile.proNone")}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="publisher" className="text-sm font-medium mb-2 block">
              {t("profile.publisher")}
            </Label>
            <Input
              id="publisher"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              className="bg-[#121212] border-white/10 text-white"
              placeholder={t("profile.publisherPlaceholder")}
              data-testid="profile-publisher-input"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("profile.roles")} <span className="text-red-500">*</span> <span className="text-gray-500 font-normal">{t("profile.selectAllThatApply")}</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {["Writer", "Producer", "Composer", "Manager", "Publisher"].map(role => (
                <label
                  key={role}
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    formData.roles.includes(role.toLowerCase())
                      ? 'bg-[#7c5cff]/20 border-[#7c5cff]'
                      : 'bg-[#121212] border-white/10 hover:border-white/30'
                  }`}
                  data-testid={`role-${role.toLowerCase()}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.toLowerCase())}
                    onChange={() => handleRoleToggle(role.toLowerCase())}
                    className="w-4 h-4 accent-[#7c5cff]"
                  />
                  <span className="text-sm">{t(`profile.role.${role.toLowerCase()}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("profile.musicStyles")} <span className="text-gray-500 font-normal">{t("profile.selectSpecialties")}</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["Pop", "Rock", "Hip-Hop", "R&B", "Country", "Jazz", "Electronic", "Latin", "Folk", "Classical", "Metal", "Indie"].map(style => (
                <label
                  key={style}
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors text-sm ${
                    formData.music_styles.includes(style)
                      ? 'bg-[#7c5cff]/20 border-[#7c5cff]'
                      : 'bg-[#121212] border-white/10 hover:border-white/30'
                  }`}
                  data-testid={`style-${style.toLowerCase()}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.music_styles.includes(style)}
                    onChange={() => handleMusicStyleToggle(style)}
                    className="w-3 h-3 accent-[#7c5cff]"
                  />
                  <span className="text-xs">{t(`profile.style.${style.toLowerCase()}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm font-medium mb-2 block">
              {t("profile.bio")}
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder={t("profile.bioPlaceholder")}
              className="bg-[#121212] border-white/10 text-white min-h-[120px]"
              data-testid="profile-bio-input"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 <strong>{t("profile.tipLabel")}</strong> {t("profile.tipText")}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {!isRequired && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-white/20 bg-transparent hover:bg-white/5"
                data-testid="profile-cancel-btn"
              >
                {t("profile.cancel")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#7c5cff] text-white hover:bg-[#6a4ef0] font-bold"
              data-testid="profile-save-btn"
            >
              {loading ? t("profile.saving") : isRequired ? t("profile.completeProfile") : t("profile.saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;