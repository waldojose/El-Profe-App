import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfileModal = ({ user, token, onClose, onUpdate }) => {
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
        toast.error("Photo must be less than 2MB");
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
      toast.error("Please fill all required fields and select at least one role");
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
      toast.error("Failed to update profile");
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
            {isRequired ? "Complete Your Profile" : "Edit Profile"}
          </DialogTitle>
          {isRequired && (
            <DialogDescription className="text-gray-400">
              You must complete your profile before collaborating. This information is used for legal split sheets.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label htmlFor="legal_name" className="text-sm font-medium mb-2 block">
              Legal Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="legal_name"
              name="legal_name"
              value={formData.legal_name}
              onChange={handleChange}
              required
              className="bg-[#121212] border-white/10 text-white"
              placeholder="John Doe"
              data-testid="profile-legal-name-input"
            />
          </div>

          <div>
            <Label htmlFor="artist_name" className="text-sm font-medium mb-2 block">
              Artist / Display Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="artist_name"
              name="artist_name"
              value={formData.artist_name}
              onChange={handleChange}
              required
              className="bg-[#121212] border-white/10 text-white"
              placeholder="J Doe"
              data-testid="profile-artist-name-input"
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-sm font-medium mb-2 block">
              Country <span className="text-red-500">*</span>
            </Label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="bg-[#121212] border-white/10 text-white"
              placeholder="United States"
              data-testid="profile-country-input"
            />
          </div>

          <div>
            <Label htmlFor="pro_affiliation" className="text-sm font-medium mb-2 block">
              PRO Affiliation <span className="text-red-500">*</span>
            </Label>
            <select
              id="pro_affiliation"
              name="pro_affiliation"
              value={formData.pro_affiliation}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-md text-white focus:border-[#FFB800] focus:outline-none"
              data-testid="profile-pro-select"
            >
              <option value="">Select PRO</option>
              <option value="ASCAP">ASCAP</option>
              <option value="BMI">BMI</option>
              <option value="SESAC">SESAC</option>
              <option value="Other">Other</option>
              <option value="None">None</option>
            </select>
          </div>

          <div>
            <Label htmlFor="publisher" className="text-sm font-medium mb-2 block">
              Publisher / Editor (Optional)
            </Label>
            <Input
              id="publisher"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              className="bg-[#121212] border-white/10 text-white"
              placeholder="Publisher name"
              data-testid="profile-publisher-input"
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-sm font-medium mb-2 block">
              Role <span className="text-red-500">*</span>
            </Label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-md text-white focus:border-[#FFB800] focus:outline-none"
              data-testid="profile-role-select"
            >
              <option value="">Select role</option>
              <option value="writer">Writer</option>
              <option value="producer">Producer</option>
              <option value="composer">Composer</option>
              <option value="manager">Manager</option>
              <option value="publisher">Publisher</option>
            </select>
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm font-medium mb-2 block">
              Bio (Optional)
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell other creators about yourself and your music style..."
              className="bg-[#121212] border-white/10 text-white min-h-[100px]"
              data-testid="profile-bio-input"
            />
            <p className="text-xs text-gray-400 mt-1">This will be visible to other users in the network</p>
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
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#FFB800] text-black hover:bg-[#e0a600] font-bold"
              data-testid="profile-save-btn"
            >
              {loading ? "Saving..." : isRequired ? "Complete Profile" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;