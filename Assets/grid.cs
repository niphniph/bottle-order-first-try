using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;

public class grid : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI textcor;
    [SerializeField] private TextMeshProUGUI leveltext;
    [SerializeField] private Sprite[] ferebi;
    [SerializeField] private Image prefabi;

    int level;
    int bottles;
    int[] x = new int[8];
    int[] randbot;
    int[] shufflebot;

    void Start()
    {
        level = 1;
        bottles = 2;
        leveltext.text="level "+level;
        setbottles();
        
    }
    void setx()
    {
        randbot = new int[bottles];
        for (int i = 0; i < x.Length; i++)
        {
            x[i] = i;
        }
    }



    void setbottles()
    {
        setx();
        for (int i = 0; i < bottles; i++)
        {
            int rnd;
            do
            {
                rnd = Random.Range(0, x.Length);
            } 
            while (x[rnd] == -1); 

            randbot[i] = x[rnd];   
            Debug.Log(randbot[i]);
            x[rnd] = -1;           
        }
        ShuffleRandbot();
        AddBottles();
    }

    void ShuffleRandbot()
    {
        shufflebot = new int[randbot.Length];
        for (int i = 0; i < randbot.Length; i++)
            shufflebot[i] = randbot[i];

        for (int i = 0; i < shufflebot.Length; i++)
        {
            int rnd = Random.Range(i, shufflebot.Length);
            int temp = shufflebot[i];
            shufflebot[i] = shufflebot[rnd];
            shufflebot[rnd] = temp;
        }

        for (int i = 0; i < shufflebot.Length; i++)
            Debug.Log("shufflebot[" + i + "] = " + shufflebot[i]);
    }

    void AddBottles()
    {
        for (int i = 0; i < bottles; i++)
        {
            Image newBottle = Instantiate(prefabi, transform);
            newBottle.sprite = ferebi[shufflebot[i]];
            newBottle.rectTransform.anchoredPosition = new Vector2(i * 100, 0);
            Draggable d = newBottle.GetComponent<Draggable>();
            if (d == null)
                d = newBottle.gameObject.AddComponent<Draggable>();

            d.correctIndex = randbot[i];      
            d.currentSlotIndex = i;          
            d.currentSlot = newBottle.rectTransform; 

            Debug.Log("Bottle " + i + " correctIndex: " + randbot[i]);
        }
    }


    public void Check()
    {
        int correct = 0;

        foreach (Draggable bottle in Object.FindObjectsByType<Draggable>(FindObjectsSortMode.None))
        {
            Image img = bottle.GetComponent<Image>();
            if (img == null) continue;

            int spriteIndex = System.Array.IndexOf(ferebi, img.sprite);
            int slotIndex = bottle.currentSlotIndex;
            if (slotIndex >= 0 && slotIndex < randbot.Length)
            {
                if (spriteIndex == randbot[slotIndex])
                    correct++;
            }
        }

        textcor.text = "Correct bottles: " + correct + "/" + bottles;
        if (correct / bottles == 1)
        {
            nextlevel();
        }
    }

    private void nextlevel()
    {
        level++;
        if (level < 8)
        {
            bottles++;
        }
        foreach (Transform child in transform)
        {
            Destroy(child.gameObject);
        }
        setbottles();
        leveltext.text = "Level " + level;
    }




}


public class Draggable : MonoBehaviour, IPointerDownHandler, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    public int correctIndex;       
    public int currentSlotIndex;  
    public RectTransform currentSlot;

    private RectTransform rectTransform;
    private Canvas canvas;
    private CanvasGroup canvasGroup;
    private Vector3 startPos;

    void Awake()
    {
        rectTransform = GetComponent<RectTransform>();
        canvas = GetComponentInParent<Canvas>();
        canvasGroup = gameObject.AddComponent<CanvasGroup>();
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        startPos = rectTransform.position;
    }

    public void OnBeginDrag(PointerEventData eventData)
    {
        canvasGroup.blocksRaycasts = false;
    }

    public void OnDrag(PointerEventData eventData)
    {
        rectTransform.position += (Vector3)eventData.delta / canvas.scaleFactor;
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        canvasGroup.blocksRaycasts = true;

        Draggable closest = null;
        float minDist = float.MaxValue;

        foreach (Draggable other in Object.FindObjectsByType<Draggable>(FindObjectsSortMode.None))
        {
            if (other == this) continue;
            float dist = Vector3.Distance(rectTransform.position, other.rectTransform.position);
            if (dist < 50f && dist < minDist)
            {
                minDist = dist;
                closest = other;
            }
        }

        if (closest != null)
        {
            Vector3 otherPos = closest.rectTransform.position;
            closest.rectTransform.position = startPos;
            rectTransform.position = otherPos;

            int tempSlot = closest.currentSlotIndex;
            closest.currentSlotIndex = this.currentSlotIndex;
            this.currentSlotIndex = tempSlot;
        }
        else
        {
            rectTransform.position = startPos;
        }
    }
}
