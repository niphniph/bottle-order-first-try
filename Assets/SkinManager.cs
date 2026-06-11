using UnityEngine;
using UnityEngine.UI;

[System.Serializable]
public class SkinData
{
    public string skinId;
    public Sprite skinSprite;
    public bool unlocked = true;
}

public class SkinManager : MonoBehaviour
{
    public static SkinManager Instance;

    public SkinData[] skins;
    public Image playerImage; // for UI player
    public SpriteRenderer playerRenderer; // for gameplay player

    private const string SelectedSkinKey = "SelectedSkin";

    private void Awake()
    {
        Instance = this;
    }

    private void Start()
    {
        string selectedSkin = PlayerPrefs.GetString(SelectedSkinKey, skins[0].skinId);
        ApplySkin(selectedSkin);
    }

    public void SelectSkin(string skinId)
    {
        PlayerPrefs.SetString(SelectedSkinKey, skinId);
        PlayerPrefs.Save();
        ApplySkin(skinId);
    }

    public void ApplySkin(string skinId)
    {
        foreach (SkinData skin in skins)
        {
            if (skin.skinId == skinId)
            {
                if (playerImage != null)
                    playerImage.sprite = skin.skinSprite;

                if (playerRenderer != null)
                    playerRenderer.sprite = skin.skinSprite;

                return;
            }
        }
    }
}
